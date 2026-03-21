# LLM Benchmarker Agent Design

**Date:** 2026-03-21
**Author:** Claude Code (with Patryk Kopycinski)
**Status:** Ready for Review

## Executive Summary

This design extends the existing `elastic-llm-benchmarker` repository with an intelligent agent for benchmarking OSS models via vLLM on GPU VMs. The agent autonomously researches optimal configurations, manages single-VM resource coordination, tests model capabilities (hardware performance, tool calling, reasoning), and publishes results to GitHub and Elasticsearch.

### Key Features

- **Dual Interface:** CLI for automation + conversational Claude agent for exploration
- **Autonomous Config Research:** HuggingFace + vLLM docs → optimal deployment params
- **Comprehensive Testing:** Hardware benchmarks + tool calling + reasoning (quality/latency)
- **Queue-Based Coordination:** Priority queue handles single-VM constraint
- **Dual Cluster Reporting:** Results → local ES + golden cluster + GitHub issue comments
- **LangGraph Enhancement:** Background discovery of promising models with auto-queueing

---

## 1. Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│  Interface Layer                             │
│  • CLI commands (src/cli.ts)                 │
│  • Claude agent skill (.claude/skills/)      │
└──────────────┬──────────────────────────────┘
               │ both call ↓
┌──────────────▼──────────────────────────────┐
│  Agent Orchestrator Layer                    │
│  • InteractiveOrchestrator (on-demand)       │
│  • LangGraph Agent (autonomous background)   │
│  • BenchmarkOrchestrationService (shared)    │
└──────────────┬──────────────────────────────┘
               │ uses ↓
┌──────────────▼──────────────────────────────┐
│  Services Layer (Enhanced)                   │
│  • ConfigResearcherService                   │
│  • CapabilityDetectionService                │
│  • ReasoningBenchmarkService                 │
│  • BenchmarkOrchestrationService             │
│  • VMResourceManagerService                  │
│  • ReportGeneratorService                    │
│  • ElasticsearchResultsStore (dual-write)    │
└──────────────┬──────────────────────────────┘
               │ uses ↓
┌──────────────▼──────────────────────────────┐
│  Infrastructure (Existing)                   │
│  • VllmEngine, SSHClient, BenchmarkRunner    │
└─────────────────────────────────────────────┘
```

**Design Principles:**
- **Reuse over duplication:** ConfigResearcher wraps existing `vllm-model-params.ts`
- **Single orchestration logic:** LangGraph and interactive agent share workflow
- **Clean separation:** Services testable in isolation, multiple interfaces

---

## 2. Core Components (Services Layer)

### New Services

#### ConfigResearcherService (`src/services/config-researcher.ts`)

**Purpose:** Autonomously determine optimal vLLM configuration

**Extends existing `vllm-model-params.ts`** (doesn't replace):
```typescript
async research(modelId: string): Promise<EnhancedVllmConfig> {
  // 1. Get base params (reuse existing - always works)
  const baseParams = getVllmParamsForModel(modelId);

  // 2. Fetch HuggingFace model card (with fallback)
  let modelCard: ModelCard | null = null;
  try {
    modelCard = await this.fetchHFModelCard(modelId);
  } catch (error) {
    this.logger.warn('HF API failed, using defaults', { modelId, error });
    // Continue with base params only - don't fail the benchmark
  }

  // 3. Calculate tensor parallel (from HF card or conservative default)
  const tensorParallel = modelCard?.parameterCountB
    ? Math.ceil(modelCard.parameterCountB / this.gpusAvailable / 35)
    : 1; // Conservative default if HF unavailable

  // 4. Detect capabilities
  const capabilities = {
    toolCalling: baseParams.toolCallParser != null,
    reasoning: modelCard ? this.detectReasoning(modelCard) : false,
    parallelToolCalls: baseParams.toolCallParser != null,
  };

  // 5. Return enhanced config
  return {
    ...baseParams,
    tensorParallelSize: tensorParallel,
    maxModelLen: modelCard?.contextWindow || 8192,
    capabilities,
    reasoning: modelCard
      ? "Based on HF card + vLLM docs"
      : "Based on vLLM defaults (HF API unavailable)",
    dataSource: modelCard ? 'hf_api' : 'fallback',
  };
}
```

**Error Handling:**
- HF API fails → Use base params + conservative defaults (don't fail benchmark)
- HF API rate limited → Exponential backoff (3 retries), then fallback
- Model not found on HF → Warn, proceed with defaults (model might be local/custom)

#### CapabilityDetectionService (`src/services/capability-detection.ts`)

**Purpose:** Unified detection for tool calling + reasoning

**Reuses:** `getVllmParamsForModel()` for tool calling
**Adds:** Reasoning detection from model card/name

```typescript
async detect(modelId: string): Promise<ModelCapabilities> {
  const params = getVllmParamsForModel(modelId);
  const modelCard = await fetchHFModelCard(modelId);

  return {
    toolCalling: {
      supported: params.toolCallParser != null,
      parser: params.toolCallParser,
    },
    reasoning: {
      supported: this.hasReasoningKeywords(modelId, modelCard),
      method: 'native', // or 'prompt-based'
    },
    parallelToolCalls: params.toolCallParser != null,
  };
}
```

#### BenchmarkOrchestrationService (`src/services/benchmark-orchestration.ts`)

**Purpose:** Shared workflow logic for both LangGraph and interactive orchestrator

**Workflow:**
```typescript
async orchestrate(
  model: ModelInfo,
  options: OrchestrationOptions
): Promise<BenchmarkResult> {
  // 1. Research config
  const config = await configResearcher.research(model.id);

  // 2. Deploy model
  const deployment = await vllmEngine.deploy(sshConfig, model, config);

  // 3. Run benchmarks (hardware + tool calling + reasoning)
  const hardwareMetrics = await benchmarkRunner.run(deployment);
  const toolCallResults = await toolCallBenchmark.run(deployment);
  const reasoningResults = await reasoningBenchmark.run(deployment);

  // 4. Stop deployment
  await vllmEngine.stop(deployment);

  // 5. Store results (dual-write)
  await resultsStore.store({
    ...hardwareMetrics,
    toolCallResults,
    reasoningResults,
  });

  // 6. Generate reports
  await reportGenerator.publish(result);

  return result;
}
```

#### ReasoningBenchmarkService (`src/services/reasoning-benchmark.ts`)

**Purpose:** Test reasoning quality + latency tradeoff

**Test suite:**
- Math word problems (5 prompts)
- Logic puzzles (5 prompts)
- Multi-step reasoning (5 prompts)

**Runs:** 2 modes per prompt (reasoning OFF vs ON)

**Output:**
```typescript
interface ReasoningBenchmarkResult {
  reasoningSupported: boolean;
  qualityImprovement: number;  // % accuracy gain
  latencyImpact: { ttftMs: number, itlMs: number };
  tokenOverhead: number;       // avg extra tokens
  recommendation: string;      // "Enable" or "Skip"
}
```

#### VMResourceManagerService (`src/services/vm-resource-manager.ts`)

**Purpose:** Coordinate access to single GPU VM (future: multiple VMs)

```typescript
class VMResourceManagerService {
  private availableVMs: VMConfig[];
  private busyVMs: Map<string, VMLeaseInfo>;

  async acquireVM(requestor: string): Promise<VMLease | null> {
    if (availableVMs.length === 0) return null;
    const vm = availableVMs.pop();
    busyVMs.set(vm.id, { modelId: requestor, startedAt: new Date() });
    return new VMLease(vm, () => this.releaseVM(vm.id));
  }

  async releaseVM(vmId: string): Promise<void> {
    const vm = busyVMs.get(vmId);
    busyVMs.delete(vmId);
    availableVMs.push(vm);
  }
}
```

#### ReportGeneratorService (`src/services/report-generator.ts`)

**Purpose:** Multi-format report generation + publishing

**Outputs:**
1. **GitHub issue comment** (via `gh` CLI or API fallback)
2. **Elasticsearch** (dual-write: local + golden)
3. **JSON file** (optional local backup)

**GitHub Publishing (primary: gh CLI, fallback: API):**
```typescript
async publishReport(markdown: string): Promise<PublishResult> {
  // Try gh CLI first
  if (await this.isGhCliAvailable()) {
    await execAsync(
      `gh issue comment 15545 ` +
      `--repo elastic/security-team ` +
      `--body-file /tmp/report.md`
    );
    return { method: 'gh_cli', success: true };
  }

  // Fallback to API
  if (process.env.GITHUB_TOKEN) {
    await octokit.rest.issues.createComment({
      owner: 'elastic',
      repo: 'security-team',
      issue_number: 15545,
      body: markdown
    });
    return { method: 'api', success: true };
  }

  // Save locally if both fail
  const fallbackPath = `./failed-reports/${Date.now()}.md`;
  await fs.writeFile(fallbackPath, markdown);
  return { success: false, fallbackPath };
}
```

### Enhanced Services

#### ElasticsearchResultsStore (enhanced, not new)

**Change:** Accepts `ClusterConfig` for dual-write

```typescript
interface ClusterConfig {
  local?: Client;
  golden?: Client;
}

async storeResult(result: BenchmarkResult): Promise<StorageStatus> {
  const status: StorageStatus = { local: false, golden: false };

  if (this.config.local) {
    await this.config.local.index({ index: 'benchmarker-results', body: result });
    status.local = true;
  }

  if (this.config.golden) {
    await this.config.golden.index({ index: 'benchmarker-results', body: result });
    status.golden = true;
  }

  // Fallback if both failed
  if (!status.local && !status.golden) {
    const fallbackPath = `./fallback-results/${result.modelId}-${Date.now()}.json`;
    await fs.writeFile(fallbackPath, JSON.stringify(result, null, 2));
    status.fallback = fallbackPath;
  }

  return status;
}
```

---

## 3. Agent Orchestrator Layer

### Two Orchestrators, Shared Services

#### LangGraph Agent (Enhanced)

**New Node:** `discover_promising_models`
- Uses ConfigResearcherService + CapabilityDetectionService
- Filters models: released <30 days, has tool calling/reasoning, fits hardware
- Scores models: `(hasToolCalling * 30) + (hasReasoning * 40) + (likes/1000)`
- Auto-adds top 5 to queue with `priority=50`

**Enhanced:** `run_benchmark` node
- Delegates to BenchmarkOrchestrationService
- Includes reasoning tests

#### Interactive Orchestrator (`src/agent/interactive-orchestrator.ts`)

**Purpose:** On-demand benchmarking via CLI/agent

```typescript
async benchmarkModel(
  modelId: string,
  options: {
    wait?: boolean;              // If true, poll until completion
    progressCallback?: (msg: string) => void;
  } = {}
): Promise<QueueEntry> {
  // 1. Research config
  options.progressCallback?.("Researching optimal config...");
  const config = await configResearcher.research(modelId);

  // 2. Add to priority queue (always queues, never immediate execution)
  options.progressCallback?.("Adding to priority queue...");
  const queueEntry = await queueService.add({
    modelId,
    priority: 100,  // Top priority (processed before auto-discovered)
    requestedBy: 'user',
    config
  });

  // 3. If wait=true, poll queue until completion
  if (options.wait) {
    await this.pollUntilComplete(queueEntry.id, options.progressCallback);
  }

  return queueEntry;
}

private async pollUntilComplete(
  queueId: string,
  progressCallback?: (msg: string) => void
): Promise<void> {
  const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  const MAX_WAIT_MS = 3600000;   // 1 hour timeout

  const startTime = Date.now();

  while (true) {
    // Timeout check
    if (Date.now() - startTime > MAX_WAIT_MS) {
      throw new Error('Benchmark timeout after 1 hour');
    }

    // Fetch queue entry via REST API
    const entry = await queueService.get(queueId);

    // Stream progress updates
    if (entry.progress?.message) {
      progressCallback?.(entry.progress.message);
    }

    // Check terminal states
    if (entry.status === 'completed') {
      progressCallback?.('✅ Benchmark complete!');
      break;
    }
    if (entry.status === 'failed') {
      throw new Error(`Benchmark failed: ${entry.error?.message}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
```

**--wait Flag Behavior (Polling Mechanism):**
- Polls `queueService.get(queueId)` every 5 seconds via REST API
- Streams progress messages to callback (CLI stdout, agent conversation)
- Blocks until status is 'completed' or 'failed'
- 1 hour timeout (prevents infinite wait if queue stalls)
- Simple HTTP polling (no WebSocket/SSE complexity)

---

## 4. Resource Management

### Single-VM Coordination via Queue

**Current Constraint:** 1 GPU VM (2xA100 40GB)
**Solution:** Priority queue + VM resource manager

**Queue Entry:**
```typescript
interface QueueEntry {
  id: string;
  modelId: string;
  priority: number;        // 100=user, 50=auto-discovered
  status: 'pending' | 'running' | 'completed' | 'failed';
  requestedBy: 'user' | 'langgraph';
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: { message: string; category: string };
  progress?: { step: string; message: string };
}
```

**Queue Storage: ES-Backed (Durable)**

**Implementation:** QueueService stores entries in Elasticsearch `benchmarker-queue` index

```typescript
class QueueService {
  private esClient: Client;

  async add(entry: Omit<QueueEntry, 'id'>): Promise<QueueEntry> {
    const queueEntry = {
      ...entry,
      id: uuidv4(),
      submittedAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    // Store in ES (durable)
    await this.esClient.index({
      index: 'benchmarker-queue',
      id: queueEntry.id,
      body: queueEntry,
    });

    return queueEntry;
  }

  async getNext(): Promise<QueueEntry | null> {
    // Query ES for highest priority pending entry
    const result = await this.esClient.search({
      index: 'benchmarker-queue',
      query: { term: { status: 'pending' } },
      sort: [
        { priority: 'desc' },
        { submitted_at: 'asc' }
      ],
      size: 1,
    });

    return result.hits.hits[0]?._source as QueueEntry | null;
  }
}
```

**Benefits:**
- ✅ Survives LangGraph crashes/restarts (entries persist)
- ✅ User requests (priority=100) never lost
- ✅ Historical record of all queued benchmarks
- ✅ Queryable via ES API

**Error Handling:**
- If ES unavailable during add(): Save to `./queue-fallback/${id}.json` + background retry
- If ES unavailable during getNext(): Read from fallback directory (process offline entries)

**VM Lease Pattern:**
```typescript
// LangGraph agent picks next entry
const entry = await queueService.getNext(); // highest priority first

// Acquire VM lease
const lease = await vmResourceManager.acquireVM(entry.modelId);

try {
  await orchestration.benchmark(entry);
} finally {
  await lease.release(); // Always release
}
```

**Interactive Request Flow:**
```
User: "/benchmark-model llama-3.3-70b"
  ↓
Agent adds to queue (priority=100)
  ↓
Returns queue ID + position
  ↓
LangGraph picks up (highest priority first)
  ↓
Benchmarks and publishes
```

### Future: Multiple VMs

When more VMs available:
- Config: `VM_CONFIGS='[{...}, {...}]'`
- VMResourceManager maintains pool of N VMs
- LangGraph processes N queue entries in parallel
- No code changes needed (architecture already supports it)

---

## 5. Reporting & Results Publishing

### Multi-Channel Publishing

**Priority:**
1. **Elasticsearch** (local + golden) — always
2. **GitHub issue comment** — primary reporting channel
3. **JSON file** — fallback if both ES fail

**GitHub Integration (gh CLI-first):**

```typescript
async postToGitHub(markdown: string): Promise<void> {
  // 1. Try gh CLI
  if (await isGhCliAvailable()) {
    const tempFile = `/tmp/benchmark-report-${Date.now()}.md`;
    await fs.writeFile(tempFile, markdown);

    await execAsync(
      `gh issue comment 15545 ` +
      `--repo elastic/security-team ` +
      `--body-file ${tempFile}`
    );
    return;
  }

  // 2. Fallback to API
  if (process.env.GITHUB_TOKEN) {
    await octokit.rest.issues.createComment({
      owner: 'elastic',
      repo: 'security-team',
      issue_number: 15545,
      body: markdown
    });
    return;
  }

  throw new Error('No GitHub auth available');
}
```

**Report Format (GitHub Comment):**

```markdown
## 🔬 Benchmark Results: `meta-llama/Llama-3.3-70B-Instruct`

**Run ID:** `2026-03-21-1647-abc123`
**Timestamp:** 2026-03-21 16:47:23 UTC

### ⚙️ vLLM Configuration
- **vLLM Version:** v0.15.1
- **Tensor Parallel:** 2
- **Max Model Length:** 8192

**Docker Command:**
```bash
docker run -d --name vllm-llama-3.3-70b \
  --gpus all --shm-size=16g -p 8000:8000 \
  vllm/vllm-openai:v0.15.1 \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --tensor-parallel-size 2 --max-model-len 8192 \
  --tool-call-parser llama3_json
```

### 🚀 Performance Metrics
| Metric | Value | Status |
|--------|-------|--------|
| ITL | 12.3 ms | ✅ |
| TTFT | 245 ms | ✅ |
| Throughput | 1,847 tok/s | ✅ |

### 🔧 Tool Calling
- Sequential: 100% (5/5)
- Parallel 2x: 100% (5/5)
- Parallel 3x: 100% (5/5)

### 🧠 Reasoning
| Test | OFF | ON | Improvement |
|------|-----|-----|-------------|
| Math | 60% | 100% | +40% ✅ |
| Logic | 80% | 100% | +20% ✅ |

**Recommendation:** ✅ Enable reasoning
```

---

## 6. Interface Layer

### CLI Interface

**New Commands:**

```bash
# Benchmark specific model (priority queue)
npx tsx src/cli.ts benchmark-model <model-id> [--wait]

# Check queue status
npx tsx src/cli.ts queue-status [queue-id]

# Check VM availability
npx tsx src/cli.ts vm-status
```

**Example Flow:**
```bash
$ npx tsx src/cli.ts benchmark-model meta-llama/Llama-3.3-70B-Instruct --wait

✓ Added to priority queue
  Queue ID: abc-123
  Position: #1

Waiting for completion...

🚀 Benchmark started
⚙️  Researching optimal config from HuggingFace...
⚙️  Deploying with tensor-parallel=2, max-model-len=8192...
⚙️  Running hardware benchmarks...
⚙️  Testing tool calling (sequential + parallel)...
⚙️  Testing reasoning (quality + latency)...
✅ Complete!

Report: https://github.com/elastic/security-team/issues/15545#issuecomment-xyz
```

### Claude Agent Skill

**File:** `.claude/skills/benchmark-model/SKILL.md`

**Conversational Flow:**
```
User: "Benchmark Llama 3.3 70B"

Agent: "I'll benchmark meta-llama/Llama-3.3-70B-Instruct!

**Researching optimal config...**
- Architecture: Llama 3.3 (70B params)
- Tool calling: ✅ Supported (llama3_json)
- Reasoning: ✅ Detected

Recommended config:
- Tensor parallel: 2
- Max model length: 8192

**Adding to priority queue...**
✓ Queue ID: abc-123
✓ Position: #1

**Streaming progress...**
🚀 Benchmark started
⚙️  Deploying...
⚙️  Testing...
✅ Complete!

Results: [GitHub link]"
```

---

## 7. End-to-End Data Flow

### Interactive Benchmark Flow

```
User Input: "Benchmark meta-llama/Llama-3.3-70B"
  ↓
ConfigResearcherService.research()
  • Fetch HF model card
  • Get base params: getVllmParamsForModel()
  • Calculate tensor parallel: 70B / 2 GPUs = 2
  • Detect capabilities
  ↓
QueueService.add({ priority: 100 })
  • Create queue entry
  • Store in ES: benchmarker-queue
  • Return queue ID
  ↓
LangGraph Agent polls queue
  • SELECT * WHERE status='pending' ORDER BY priority DESC
  • Acquire VM lease
  • Update status: 'running'
  ↓
BenchmarkOrchestrationService.orchestrate()
  • VllmEngine.deploy()
  • BenchmarkRunner.run()
  • ToolCallBenchmark.run()
  • ReasoningBenchmark.run()
  • VllmEngine.stop()
  ↓
ElasticsearchResultsStore.store()
  • Dual-write: local + golden clusters
  • Index: benchmarker-results
  ↓
ReportGeneratorService.publish()
  • Generate markdown
  • Post via gh CLI (or API fallback)
  • Update queue: status='completed'
  ↓
User Notification
  • CLI: Print completion + links
  • Agent: Stream final update
  • GitHub: Comment posted
```

### Autonomous Discovery Flow

```
LangGraph: discover_promising_models
  ↓
HuggingFace API: /models?sort=likes&limit=100
  • Filter: released <30 days, >100 likes
  ↓
For each model:
  • CapabilityDetectionService.detect()
  • ConfigResearcherService.estimateSize()
  • Check if already benchmarked
  ↓
Score models:
  score = (toolCalling*30) + (reasoning*40) + (likes/1000)
  ↓
Top 5 → QueueService.add({ priority: 50 })
  ↓
[Same orchestration as interactive flow]
```

---

## 8. Configuration & Credentials

### Environment Variables

**`.env` structure:**
```bash
# SSH & GPU VM
SSH_HOST=10.128.0.2
SSH_USERNAME=your-username
SSH_PRIVATE_KEY_PATH=~/.ssh/id_rsa

# HuggingFace
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxx

# Elasticsearch - Local
ES_LOCAL_URL=http://localhost:9200
ES_LOCAL_USERNAME=elastic
ES_LOCAL_PASSWORD=changeme

# Elasticsearch - Golden
ES_GOLDEN_CLOUD_ID=your-deployment:xxxxx
ES_GOLDEN_API_KEY=xxxxxxxxxxxxx

# GitHub (gh CLI primary, token fallback)
GITHUB_ISSUE_URL=https://github.com/elastic/security-team/issues/15545
# GITHUB_TOKEN=ghp_xxxxx  # Optional

# vLLM
VLLM_DOCKER_IMAGE=vllm/vllm-openai:v0.15.1
VLLM_API_PORT=8000
```

### Credential Security

**`.gitignore`:**
```bash
.env
.env.local
*.env
logs/
reports/
```

**Pre-commit Hook:** `scripts/pre-commit-check-credentials.sh`
```bash
#!/bin/bash
# Detect patterns: ghp_, hf_, ssh keys, API keys
# Block commit if found
```

**Auto-install (via husky):**
```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

---

## 9. Error Handling & Recovery

### Error Categories

| Category | Examples | Recovery |
|----------|----------|----------|
| **resource_exhausted** | VRAM OOM | Reduce max_model_len 25%, retry (max 1) |
| **infrastructure** | SSH timeout, docker pull fail | Exponential backoff, retry (max 3) |
| **timeout** | Health check timeout | Increase timeout 2x, retry (max 1) |
| **capability_mismatch** | Tool calling unsupported | Skip test, continue (partial success) |
| **storage_failed** | ES cluster down | Fallback to local file |
| **rate_limited** | GitHub API limit | Queue for retry after 1h |

### Automatic Retry Mechanism (Within Orchestrator)

**VRAM OOM Retry Example:**

Retries happen **automatically within BenchmarkOrchestrationService**, NOT via re-queueing:

```typescript
async orchestrate(model: ModelInfo, config: VllmConfig): Promise<BenchmarkResult> {
  let attemptNumber = 0;
  let currentConfig = config;

  while (attemptNumber < 2) { // max 1 retry = 2 total attempts
    try {
      const deployment = await vllmEngine.deploy(model, currentConfig);
      const results = await this.runAllBenchmarks(deployment);
      await vllmEngine.stop(deployment);
      return results;

    } catch (error) {
      if (error.category === 'resource_exhausted' && attemptNumber < 1) {
        // Retry with reduced max_model_len
        currentConfig = {
          ...currentConfig,
          maxModelLen: Math.floor(currentConfig.maxModelLen * 0.75),
        };
        this.logger.warn('VRAM OOM - retrying with reduced max_model_len', {
          oldLen: config.maxModelLen,
          newLen: currentConfig.maxModelLen,
        });
        attemptNumber++;
        continue; // Retry loop

      } else {
        // Non-retryable error or max retries exceeded
        throw error;
      }
    }
  }
}
```

**Key Points:**
- Retry is **automatic** within the same queue entry
- Queue entry status remains 'running' during retry
- Only changes queue status to 'failed' after all retries exhausted
- User sees progress updates: "Retry 1/1: Reducing max_model_len to 6144..."

### Partial Success Handling

```typescript
async runBenchmarks(): Promise<BenchmarkResult> {
  const result = { failures: [] };

  // Required: hardware benchmarks
  try {
    result.hardware = await runHardware();
  } catch (e) {
    throw new Error('Hardware benchmarks failed'); // Total failure
  }

  // Optional: tool calling
  try {
    result.toolCalling = await runToolCalling();
  } catch (e) {
    result.toolCalling = { supported: false };
    result.failures.push('tool_calling');
  }

  // Optional: reasoning
  try {
    result.reasoning = await runReasoning();
  } catch (e) {
    result.reasoning = { supported: false };
    result.failures.push('reasoning');
  }

  // Pass if hardware succeeded
  result.passed = result.failures.length <= 2 && result.hardware != null;
  return result;
}
```

### Dual-Write Resilience

```typescript
async storeResults(result): Promise<StorageStatus> {
  const status = { local: false, golden: false };

  try {
    await localClient.index(result);
    status.local = true;
  } catch (e) {
    logger.error('Local ES failed', e);
  }

  try {
    await goldenClient.index(result);
    status.golden = true;
  } catch (e) {
    logger.error('Golden ES failed', e);
  }

  // Fallback if both failed
  if (!status.local && !status.golden) {
    const fallbackPath = `./fallback-results/${result.modelId}.json`;
    await fs.writeFile(fallbackPath, JSON.stringify(result));
    status.fallback = fallbackPath;
  }

  return status;
}
```

---

## 10. Testing Strategy

### Test Pyramid

```
        E2E (2 tests)
    Integration (10 tests)
  Unit Tests (50+ tests)
```

### Critical Test Suites

#### 1. Unit Tests (Vitest)

**`config-researcher.test.ts`:**
- Tensor parallel calculation (70B / 2 GPUs = 2)
- Tool calling detection from params
- Reasoning detection from model card

**`vm-resource-manager.test.ts`:**
- Acquire and release VM lease
- Return null when all VMs busy

**`github-report-publisher.test.ts`:**
- Try gh CLI before API fallback
- Handle gh CLI unavailable

#### 2. Integration Tests (Test Containers)

**`elasticsearch-integration.test.ts`:**
- Dual-write to local + golden clusters
- Fallback to file if both fail

**`queue-processing-integration.test.ts`:**
- Process priority queue (user requests first)

#### 3. Concurrency Tests ⚠️ **CRITICAL**

**`concurrency/race-conditions.test.ts`:**
```typescript
it('should handle simultaneous benchmark requests', async () => {
  const [r1, r2] = await Promise.all([
    cli.benchmarkModel('model-1'),
    cli.benchmarkModel('model-2')
  ]);

  // One running, one queued
  expect(
    (r1.status === 'running' && r2.status === 'queued') ||
    (r1.status === 'queued' && r2.status === 'running')
  ).toBe(true);
});
```

#### 4. Resilience Tests ⚠️ **CRITICAL**

**`resilience/failover.test.ts`:**
```typescript
it('should continue if golden cluster fails mid-benchmark', async () => {
  const benchmark = orchestrator.start(model);

  // Kill golden cluster mid-benchmark
  await goldenCluster.stop();

  const result = await benchmark;
  expect(result.storageStatus.local).toBe(true);
  expect(result.storageStatus.golden).toBe(false);
  expect(result.storageStatus.fallback).toBeDefined();
});
```

**`resilience/network-partition.test.ts`:**
```typescript
it('should detect SSH connection loss', async () => {
  const deployment = vllmEngine.deploy(model);

  // Simulate network partition
  await sshClient.disconnect();

  await expect(deployment).rejects.toThrow('SSH connection lost');
});
```

#### 5. Security Tests ⚠️ **CRITICAL**

**`security/credential-detection.test.ts`:**
```typescript
it('should prevent committing credentials', async () => {
  await fs.writeFile('.env.test', 'GITHUB_TOKEN=ghp_fake123');
  await exec('git add .env.test');

  const result = await exec('git commit -m "test"');
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('ERROR: Credential pattern found');
});
```

#### 6. E2E Tests (Real VM)

**`e2e/realistic-model.test.ts`:**
```typescript
// Use 7B model (not 0.5B) for realistic testing
const TEST_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

it('should complete full benchmark workflow', async () => {
  const result = await cli.benchmarkModel(TEST_MODEL, { wait: true });

  expect(result.status).toBe('completed');

  // Verify ES
  const esDoc = await esClient.get({ index: 'benchmarker-results', id: result.id });
  expect(esDoc._source.passed).toBe(true);

  // Verify GitHub
  const comments = await getGitHubComments(GITHUB_ISSUE_URL);
  expect(comments[0].body).toContain(TEST_MODEL);
}, 900000); // 15 min timeout
```

#### 7. GitHub Rate Limiting

**`integration/github-rate-limit.test.ts`:**
```typescript
it('should handle rate limit gracefully', async () => {
  mockGitHub.setRateLimited(true);

  const result = await publisher.postReport(markdown);

  expect(result.status).toBe('rate_limited');
  expect(result.retryAfter).toBeDefined();
});
```

### Coverage Targets

| Component | Target | Critical Areas |
|-----------|--------|----------------|
| Services | 90% | Config research, VM manager |
| Orchestrators | 85% | Error recovery, partial success |
| CLI | 70% | Integration tested |
| Overall | 85% | **Must include concurrency & failover** |

### CI/CD Pipeline

**`.github/workflows/test.yml`:**
```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      elasticsearch:
        image: elasticsearch:8.11.0
    steps:
      - run: npm run test:integration

  concurrency-resilience-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:concurrency
      - run: npm run test:resilience

  e2e-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run test:e2e
        env:
          SSH_HOST: ${{ secrets.GPU_VM_HOST }}
```

---

## Implementation Checklist

### Phase 1: Core Services (Week 1)
- [ ] ConfigResearcherService (wraps vllm-model-params)
- [ ] CapabilityDetectionService
- [ ] VMResourceManagerService
- [ ] ReasoningBenchmarkService
- [ ] Unit tests for all services

### Phase 2: Orchestration (Week 2)
- [ ] BenchmarkOrchestrationService
- [ ] InteractiveOrchestrator
- [ ] Enhance LangGraph discover_promising_models node
- [ ] Integration tests

### Phase 3: Reporting & Storage (Week 3)
- [ ] Enhance ElasticsearchResultsStore (dual-write)
- [ ] ReportGeneratorService (GitHub via gh CLI)
- [ ] Concurrency & failover tests

### Phase 4: Interfaces (Week 4)
- [ ] CLI commands (benchmark-model, queue-status, vm-status)
- [ ] Claude agent skill
- [ ] E2E tests with 7B model

### Phase 5: Security & Polish (Week 5)
- [ ] Pre-commit hook validation
- [ ] Credential detection tests
- [ ] Documentation
- [ ] CI/CD pipeline

---

## Success Criteria

✅ **Functionality:**
- Interactive benchmarking (CLI + agent) completes successfully
- LangGraph autonomously discovers and queues promising models
- Results appear in: local ES + golden ES + GitHub issue

✅ **Quality:**
- 85%+ test coverage with critical areas covered
- All concurrency, failover, and security tests pass
- No credentials in git history

✅ **Performance:**
- Config research completes in <30s
- Queue processing handles 100+ entries
- Dual-write resilience: at least one cluster succeeds

✅ **Usability:**
- CLI returns queue ID in <5s
- Claude agent streams progress in real-time
- GitHub comments have complete reproducibility info

---

## Future Enhancements

1. **Multiple VMs:** Scale to N parallel benchmarks
2. **Model comparison UI:** Interactive dashboard for comparing results
3. **Auto-optimization:** Try multiple configs, pick best
4. **Cost tracking:** Monitor GPU-hour costs per model
5. **Regression detection:** Alert when performance degrades

---

## Appendix: File Structure

```
elastic-llm-benchmarker/
├── .claude/
│   └── skills/
│       └── benchmark-model/
│           └── SKILL.md
├── src/
│   ├── agent/
│   │   ├── interactive-orchestrator.ts       # NEW
│   │   ├── graph.ts                          # ENHANCED
│   │   └── nodes.ts                          # ENHANCED
│   ├── services/
│   │   ├── config-researcher.ts              # NEW
│   │   ├── capability-detection.ts           # NEW
│   │   ├── reasoning-benchmark.ts            # NEW
│   │   ├── benchmark-orchestration.ts        # NEW
│   │   ├── vm-resource-manager.ts            # NEW
│   │   ├── report-generator.ts               # NEW
│   │   ├── elasticsearch-results-store.ts    # ENHANCED
│   │   └── vllm-model-params.ts              # EXISTING (reused)
│   └── cli.ts                                # ENHANCED
├── scripts/
│   └── pre-commit-check-credentials.sh       # NEW
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── concurrency/                          # NEW
│   ├── resilience/                           # NEW
│   ├── security/                             # NEW
│   └── e2e/
├── .env.example
├── .gitignore
└── package.json
```

---

## Implementation Decisions

**✅ Resolved During Design:**

1. **Queue persistence:** ES-backed (durable, survives restarts)
2. **--wait behavior:** HTTP polling every 5s (no WebSocket/SSE)
3. **Error retry:** Automatic within orchestrator (not via re-queue)
4. **HF API fallback:** Use defaults + warn (don't fail benchmark)
5. **GitHub auth:** gh CLI primary, API token fallback
6. **Cluster writes:** Dual-write always (local + golden)

**❓ Open Questions for Planning Phase:**

1. **LangGraph integration:** Add reasoning tests to existing `run_benchmark` node (recommended) or create separate `run_reasoning_benchmark` node?
2. **Reporting:** Single GitHub issue for all models (current design), or support multiple issues per model family?
3. **Config overrides:** CLI should allow key params only (--tensor-parallel, --max-model-len) to keep UX simple

---

**Status:** Ready for review → implementation planning
