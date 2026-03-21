# LLM Benchmarker Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend elastic-llm-benchmarker with intelligent agent for autonomous model benchmarking

**Architecture:** Three-layer (Services → Orchestrators → Interfaces) with ES-backed queue coordination, dual ES write (local+golden), GitHub issue reporting via gh CLI

**Tech Stack:** TypeScript, LangGraph, Elasticsearch, HuggingFace API, vLLM, Vitest

**Spec:** [2026-03-21-llm-benchmarker-agent-design.md](../specs/2026-03-21-llm-benchmarker-agent-design.md)

---

## File Structure

**New Files:**
```
elastic-llm-benchmarker/
├── .claude/
│   └── skills/
│       └── benchmark-model/
│           └── SKILL.md
├── src/
│   ├── agent/
│   │   └── interactive-orchestrator.ts
│   ├── services/
│   │   ├── config-researcher.ts
│   │   ├── capability-detection.ts
│   │   ├── reasoning-benchmark.ts
│   │   ├── benchmark-orchestration.ts
│   │   ├── vm-resource-manager.ts
│   │   ├── report-generator.ts
│   │   └── github-publisher.ts
│   └── types/
│       └── reasoning.ts
├── tests/
│   ├── unit/
│   │   ├── config-researcher.test.ts
│   │   ├── vm-resource-manager.test.ts
│   │   └── github-publisher.test.ts
│   ├── integration/
│   │   ├── elasticsearch-dual-write.test.ts
│   │   └── queue-processing.test.ts
│   ├── concurrency/
│   │   └── race-conditions.test.ts
│   ├── resilience/
│   │   ├── failover.test.ts
│   │   └── network-partition.test.ts
│   └── e2e/
│       └── realistic-model.test.ts
└── scripts/
    └── pre-commit-check-credentials.sh
```

**Modified Files:**
- `src/cli.ts` - Add benchmark-model, queue-status, vm-status commands
- `src/services/elasticsearch-results-store.ts` - Add dual-write support
- `src/agent/nodes.ts` - Enhance run_benchmark node with reasoning
- `package.json` - Add dependencies (husky, @octokit/rest)
- `.gitignore` - Enhance credential protection
- `.env.example` - Add golden cluster, GitHub config

---

## Phase 1: Core Services (Foundation)

### Task 1: Types for Reasoning

**Files:**
- Create: `elastic-llm-benchmarker/src/types/reasoning.ts`

- [ ] **Step 1: Create reasoning types file**

```typescript
// elastic-llm-benchmarker/src/types/reasoning.ts

export interface ReasoningTestCase {
  prompt: string;
  expectedAnswer: string;
  category: 'math' | 'logic' | 'multi_step';
}

export interface ReasoningTestResult {
  testCase: ReasoningTestCase;
  reasoningEnabled: boolean;
  answerCorrect: boolean;
  ttftMs: number;
  itlMs: number;
  totalTokens: number;
  reasoningTokens?: number;
  latencyMs: number;
}

export interface ReasoningBenchmarkResult {
  modelId: string;
  reasoningSupported: boolean;
  resultsWithoutReasoning: ReasoningTestResult[];
  resultsWithReasoning: ReasoningTestResult[];
  qualityImprovement: number;
  latencyImpact: { ttftMs: number; itlMs: number };
  tokenOverhead: number;
  recommendation: 'enable' | 'skip';
  reasoning: string;
}

export interface ModelCapabilities {
  toolCalling: {
    supported: boolean;
    parser: string | null;
  };
  reasoning: {
    supported: boolean;
    method: 'native' | 'prompt-based';
  };
  parallelToolCalls: boolean;
}

export interface EnhancedVllmConfig {
  toolCallParser: string | null;
  chatTemplate: string | null;
  extraArgs: string[];
  family: string;
  unslothTemplateKey: string | null;
  tensorParallelSize: number;
  maxModelLen: number;
  capabilities: ModelCapabilities;
  reasoning: string;
  dataSource: 'hf_api' | 'fallback';
}
```

- [ ] **Step 2: Export from index**

```bash
# elastic-llm-benchmarker/src/types/index.ts
# Add line:
export * from './reasoning.js';
```

- [ ] **Step 3: Commit**

```bash
cd elastic-llm-benchmarker
git add src/types/reasoning.ts src/types/index.ts
git commit -m "feat: add reasoning benchmark types"
```

---

### Task 2: CapabilityDetectionService

**Files:**
- Create: `elastic-llm-benchmarker/src/services/capability-detection.ts`
- Test: `elastic-llm-benchmarker/tests/unit/capability-detection.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/capability-detection.test.ts
import { describe, it, expect } from 'vitest';
import { CapabilityDetectionService } from '../../src/services/capability-detection.js';

describe('CapabilityDetectionService', () => {
  it('should detect tool calling from vllm params', async () => {
    const service = new CapabilityDetectionService();
    const caps = await service.detect('meta-llama/Llama-3.3-70B-Instruct');

    expect(caps.toolCalling.supported).toBe(true);
    expect(caps.toolCalling.parser).toBe('llama3_json');
  });

  it('should detect reasoning from model name keywords', async () => {
    const service = new CapabilityDetectionService();
    const caps = await service.detect('deepseek-ai/DeepSeek-R1');

    expect(caps.reasoning.supported).toBe(true);
  });

  it('should return false for models without reasoning', async () => {
    const service = new CapabilityDetectionService();
    const caps = await service.detect('meta-llama/Llama-2-7b');

    expect(caps.reasoning.supported).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd elastic-llm-benchmarker
npx vitest run tests/unit/capability-detection.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Implement CapabilityDetectionService**

```typescript
// src/services/capability-detection.ts
import { getVllmParamsForModel } from './vllm-model-params.js';
import type { ModelCapabilities } from '../types/reasoning.js';

export class CapabilityDetectionService {
  async detect(modelId: string): Promise<ModelCapabilities> {
    const params = getVllmParamsForModel(modelId);

    return {
      toolCalling: {
        supported: params.toolCallParser != null,
        parser: params.toolCallParser,
      },
      reasoning: {
        supported: this.detectReasoning(modelId),
        method: 'native',
      },
      parallelToolCalls: params.toolCallParser != null,
    };
  }

  private detectReasoning(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    const keywords = ['reasoning', 'r1', 'o1', 'deepseek-r', 'qwq', 'extended-thinking'];
    return keywords.some(kw => lower.includes(kw));
  }
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
npx vitest run tests/unit/capability-detection.test.ts
# Expected: PASS (3 tests)
```

- [ ] **Step 5: Commit**

```bash
git add src/services/capability-detection.ts tests/unit/capability-detection.test.ts
git commit -m "feat: add capability detection service for tool calling and reasoning"
```

---

### Task 3: ConfigResearcherService

**Files:**
- Create: `elastic-llm-benchmarker/src/services/config-researcher.ts`
- Test: `elastic-llm-benchmarker/tests/unit/config-researcher.test.ts`

- [ ] **Step 1: Install HuggingFace Hub dependency**

```bash
cd elastic-llm-benchmarker
npm install @huggingface/hub
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/unit/config-researcher.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ConfigResearcherService } from '../../src/services/config-researcher.js';

vi.mock('@huggingface/hub', () => ({
  HfApi: vi.fn().mockImplementation(() => ({
    modelInfo: vi.fn().mockResolvedValue({
      id: 'meta-llama/Llama-3.3-70B-Instruct',
      config: {
        architectures: ['LlamaForCausalLM'],
        max_position_embeddings: 8192,
      },
      safetensors: {
        total: 70000000000, // 70B params
      },
    }),
  })),
}));

describe('ConfigResearcherService', () => {
  it('should calculate tensor parallel based on model size', async () => {
    const service = new ConfigResearcherService({ gpusAvailable: 2 });
    const config = await service.research('meta-llama/Llama-3.3-70B-Instruct');

    expect(config.tensorParallelSize).toBe(2); // 70B / 2 GPUs / 35B = 1, ceil = 2
  });

  it('should fallback to defaults if HF API fails', async () => {
    const failingService = new ConfigResearcherService({ gpusAvailable: 2 });
    vi.spyOn(failingService as any, 'fetchHFModelCard').mockRejectedValue(new Error('API failed'));

    const config = await failingService.research('unknown/model');

    expect(config.tensorParallelSize).toBe(1); // Conservative default
    expect(config.dataSource).toBe('fallback');
  });
});
```

- [ ] **Step 3: Run test to verify failure**

```bash
npx vitest run tests/unit/config-researcher.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 4: Implement ConfigResearcherService**

```typescript
// src/services/config-researcher.ts
import { HfApi } from '@huggingface/hub';
import { getVllmParamsForModel } from './vllm-model-params.js';
import type { EnhancedVllmConfig } from '../types/reasoning.js';
import { createLogger } from '../utils/logger.js';

interface ConfigResearcherOptions {
  gpusAvailable: number;
  huggingfaceToken?: string;
  logLevel?: string;
}

export class ConfigResearcherService {
  private hfApi: HfApi;
  private logger;
  private gpusAvailable: number;

  constructor(options: ConfigResearcherOptions) {
    this.gpusAvailable = options.gpusAvailable;
    this.logger = createLogger(options.logLevel || 'info');
    this.hfApi = new HfApi({
      credentials: { accessToken: options.huggingfaceToken },
    });
  }

  async research(modelId: string): Promise<EnhancedVllmConfig> {
    const baseParams = getVllmParamsForModel(modelId);

    let modelCard = null;
    try {
      modelCard = await this.fetchHFModelCard(modelId);
    } catch (error) {
      this.logger.warn('HF API failed, using defaults', { modelId, error });
    }

    const tensorParallel = modelCard?.parameterCountB
      ? Math.ceil(modelCard.parameterCountB / this.gpusAvailable / 35)
      : 1;

    const capabilities = {
      toolCalling: {
        supported: baseParams.toolCallParser != null,
        parser: baseParams.toolCallParser,
      },
      reasoning: {
        supported: modelCard ? this.detectReasoning(modelId, modelCard) : false,
        method: 'native' as const,
      },
      parallelToolCalls: baseParams.toolCallParser != null,
    };

    return {
      ...baseParams,
      tensorParallelSize: tensorParallel,
      maxModelLen: modelCard?.contextWindow || 8192,
      capabilities,
      reasoning: modelCard
        ? 'Based on HF card + vLLM docs'
        : 'Based on vLLM defaults (HF API unavailable)',
      dataSource: modelCard ? 'hf_api' : 'fallback',
    };
  }

  private async fetchHFModelCard(modelId: string) {
    const info = await this.hfApi.modelInfo({ name: modelId });
    const paramCountB = info.safetensors?.total
      ? info.safetensors.total / 1_000_000_000
      : null;

    return {
      id: info.id,
      architecture: info.config?.architectures?.[0] || 'unknown',
      parameterCountB,
      contextWindow: info.config?.max_position_embeddings || 8192,
      modelCard: info.cardData,
    };
  }

  private detectReasoning(modelId: string, modelCard: any): boolean {
    const lower = modelId.toLowerCase();
    const keywords = ['reasoning', 'r1', 'o1', 'deepseek-r', 'qwq'];
    return keywords.some(kw => lower.includes(kw));
  }
}
```

- [ ] **Step 5: Run test to verify pass**

```bash
npx vitest run tests/unit/config-researcher.test.ts
# Expected: PASS (2 tests)
```

- [ ] **Step 6: Commit**

```bash
git add src/services/config-researcher.ts tests/unit/config-researcher.test.ts package.json package-lock.json
git commit -m "feat: add config researcher service with HF API integration"
```

---

### Task 4: VMResourceManagerService

**Files:**
- Create: `elastic-llm-benchmarker/src/services/vm-resource-manager.ts`
- Test: `elastic-llm-benchmarker/tests/unit/vm-resource-manager.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/vm-resource-manager.test.ts
import { describe, it, expect } from 'vitest';
import { VMResourceManagerService, VMLease } from '../../src/services/vm-resource-manager.js';

describe('VMResourceManagerService', () => {
  const vmConfig = {
    id: 'vm-1',
    host: '10.0.1.10',
    port: 22,
    username: 'test',
    gpus: '2xA100-40GB',
  };

  it('should acquire and release VM lease', async () => {
    const manager = new VMResourceManagerService([vmConfig]);

    const lease = await manager.acquireVM('model-123');
    expect(lease).toBeDefined();
    expect(manager.isVMAvailable()).toBe(false);

    await lease!.release();
    expect(manager.isVMAvailable()).toBe(true);
  });

  it('should return null when all VMs busy', async () => {
    const manager = new VMResourceManagerService([vmConfig]);

    const lease1 = await manager.acquireVM('model-1');
    const lease2 = await manager.acquireVM('model-2');

    expect(lease1).toBeDefined();
    expect(lease2).toBeNull();
  });

  it('should release VM even if already released', async () => {
    const manager = new VMResourceManagerService([vmConfig]);
    const lease = await manager.acquireVM('model-1');

    await lease!.release();
    await lease!.release(); // Should not throw

    expect(manager.isVMAvailable()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npx vitest run tests/unit/vm-resource-manager.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Implement VMResourceManagerService**

```typescript
// src/services/vm-resource-manager.ts
import type { SSHConfig } from '../types/config.js';

export interface VMConfig extends SSHConfig {
  id: string;
  gpus: string;
}

interface VMLeaseInfo {
  modelId: string;
  startedAt: Date;
}

export class VMLease {
  private released = false;

  constructor(
    public vm: VMConfig,
    private releaseFn: () => Promise<void>
  ) {}

  async release(): Promise<void> {
    if (this.released) return;
    this.released = true;
    await this.releaseFn();
  }
}

export class VMResourceManagerService {
  private availableVMs: VMConfig[];
  private busyVMs: Map<string, VMLeaseInfo>;

  constructor(vms: VMConfig[]) {
    this.availableVMs = [...vms];
    this.busyVMs = new Map();
  }

  async acquireVM(requestor: string): Promise<VMLease | null> {
    if (this.availableVMs.length === 0) return null;

    const vm = this.availableVMs.pop()!;
    this.busyVMs.set(vm.id, {
      modelId: requestor,
      startedAt: new Date(),
    });

    return new VMLease(vm, async () => {
      this.busyVMs.delete(vm.id);
      this.availableVMs.push(vm);
    });
  }

  isVMAvailable(): boolean {
    return this.availableVMs.length > 0;
  }

  getVMStatus() {
    return {
      available: this.availableVMs.map(vm => ({ id: vm.id, gpus: vm.gpus })),
      busy: Array.from(this.busyVMs.entries()).map(([id, info]) => ({
        id,
        modelId: info.modelId,
        startedAt: info.startedAt.toISOString(),
      })),
    };
  }
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
npx vitest run tests/unit/vm-resource-manager.test.ts
# Expected: PASS (3 tests)
```

- [ ] **Step 5: Commit**

```bash
git add src/services/vm-resource-manager.ts tests/unit/vm-resource-manager.test.ts
git commit -m "feat: add VM resource manager for single-VM coordination"
```

---

### Task 5: ReasoningBenchmarkService

**Files:**
- Create: `elastic-llm-benchmarker/src/services/reasoning-benchmark.ts`
- Test: `elastic-llm-benchmarker/tests/unit/reasoning-benchmark.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/reasoning-benchmark.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ReasoningBenchmarkService } from '../../src/services/reasoning-benchmark.js';

describe('ReasoningBenchmarkService', () => {
  it('should run tests with and without reasoning', async () => {
    const mockApi = {
      chat: {
        completions: {
          create: vi.fn()
            .mockResolvedValueOnce({
              choices: [{ message: { content: '21' } }],
              usage: { total_tokens: 50 },
            })
            .mockResolvedValueOnce({
              choices: [{ message: { content: '21' } }],
              usage: { total_tokens: 68 },
            }),
        },
      },
    };

    const service = new ReasoningBenchmarkService({
      baseUrl: 'http://localhost:8000',
      model: 'test-model',
      apiClient: mockApi as any,
    });

    const result = await service.run();

    expect(result.resultsWithoutReasoning).toHaveLength(1);
    expect(result.resultsWithReasoning).toHaveLength(1);
    expect(result.tokenOverhead).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run tests/unit/reasoning-benchmark.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement ReasoningBenchmarkService**

```typescript
// src/services/reasoning-benchmark.ts
import OpenAI from 'openai';
import type {
  ReasoningTestCase,
  ReasoningTestResult,
  ReasoningBenchmarkResult,
} from '../types/reasoning.js';

const TEST_CASES: ReasoningTestCase[] = [
  // Math problems (5)
  {
    prompt: 'If a train leaves station A at 2pm going 60mph, and another leaves station B at 3pm going 80mph, and they are 200 miles apart, when do they meet?',
    expectedAnswer: '4:30pm',
    category: 'math',
  },
  {
    prompt: 'A store has 15 apples. They sell 7 and receive a shipment of 24. Then they sell 11. How many apples remain?',
    expectedAnswer: '21',
    category: 'math',
  },
  {
    prompt: 'If 3 workers can build a wall in 6 days, how long would it take 9 workers?',
    expectedAnswer: '2 days',
    category: 'math',
  },
  {
    prompt: 'A number is 4 more than twice another number. Their sum is 37. What are the numbers?',
    expectedAnswer: '11 and 26',
    category: 'math',
  },
  {
    prompt: 'If you save $50 per month with 3% annual interest, how much after 2 years?',
    expectedAnswer: 'approximately $1236',
    category: 'math',
  },

  // Logic puzzles (5)
  {
    prompt: 'All roses are flowers. Some flowers fade quickly. Do all roses fade quickly?',
    expectedAnswer: 'no',
    category: 'logic',
  },
  {
    prompt: 'If it rains, the ground gets wet. The ground is wet. Did it rain?',
    expectedAnswer: 'not necessarily',
    category: 'logic',
  },
  {
    prompt: 'All cats are mammals. Some mammals can fly. Can all cats fly?',
    expectedAnswer: 'no',
    category: 'logic',
  },
  {
    prompt: 'A says B is lying. B says C is lying. C says both A and B are lying. Who is truthful?',
    expectedAnswer: 'C is truthful',
    category: 'logic',
  },
  {
    prompt: 'If you have me, you want to share me. If you share me, you no longer have me. What am I?',
    expectedAnswer: 'a secret',
    category: 'logic',
  },

  // Multi-step reasoning (5)
  {
    prompt: 'A farmer has chickens and rabbits. There are 20 heads and 56 legs total. How many chickens?',
    expectedAnswer: '12 chickens',
    category: 'multi_step',
  },
  {
    prompt: 'You have a 3L jug and 5L jug. How do you measure exactly 4L?',
    expectedAnswer: 'fill 5L, pour into 3L, empty 3L, pour remaining 2L into 3L, fill 5L again, pour into 3L until full (1L more) = 4L in 5L jug',
    category: 'multi_step',
  },
  {
    prompt: 'Three light switches outside a room control three bulbs inside. You can flip switches, enter once, and must determine which switch controls which bulb. How?',
    expectedAnswer: 'turn on switch 1 for 5 minutes, turn off, turn on switch 2, enter room: hot-off=1, on=2, cold-off=3',
    category: 'multi_step',
  },
  {
    prompt: 'You have 8 balls, one is heavier. Using a balance scale 2 times, find the heavy ball.',
    expectedAnswer: 'weigh 3 vs 3, if balanced heavy is in remaining 2, weigh those; if unbalanced weigh 2 from heavy side',
    category: 'multi_step',
  },
  {
    prompt: 'A snail climbs 3 feet up a 10-foot wall each day, slides down 2 feet at night. How many days to reach top?',
    expectedAnswer: '8 days',
    category: 'multi_step',
  },
];

export class ReasoningBenchmarkService {
  private client: OpenAI;
  private model: string;

  constructor(options: { baseUrl: string; model: string; apiClient?: any }) {
    this.client = options.apiClient || new OpenAI({
      baseURL: `${options.baseUrl}/v1`,
      apiKey: 'not-needed',
    });
    this.model = options.model;
  }

  async run(): Promise<ReasoningBenchmarkResult> {
    const resultsOff: ReasoningTestResult[] = [];
    const resultsOn: ReasoningTestResult[] = [];

    for (const testCase of TEST_CASES) {
      resultsOff.push(await this.runTest(testCase, false));
      resultsOn.push(await this.runTest(testCase, true));
    }

    const qualityOff = resultsOff.filter(r => r.answerCorrect).length / resultsOff.length;
    const qualityOn = resultsOn.filter(r => r.answerCorrect).length / resultsOn.length;

    const avgTokensOff = resultsOff.reduce((sum, r) => sum + r.totalTokens, 0) / resultsOff.length;
    const avgTokensOn = resultsOn.reduce((sum, r) => sum + r.totalTokens, 0) / resultsOn.length;

    const avgTtftOff = resultsOff.reduce((sum, r) => sum + r.ttftMs, 0) / resultsOff.length;
    const avgTtftOn = resultsOn.reduce((sum, r) => sum + r.ttftMs, 0) / resultsOn.length;
    const avgItlOff = resultsOff.reduce((sum, r) => sum + r.itlMs, 0) / resultsOff.length;
    const avgItlOn = resultsOn.reduce((sum, r) => sum + r.itlMs, 0) / resultsOn.length;

    const qualityImprovement = qualityOn - qualityOff;
    const tokenOverhead = avgTokensOn - avgTokensOff;

    return {
      modelId: this.model,
      reasoningSupported: qualityImprovement > 0,
      resultsWithoutReasoning: resultsOff,
      resultsWithReasoning: resultsOn,
      qualityImprovement,
      latencyImpact: {
        ttftMs: avgTtftOn - avgTtftOff,
        itlMs: avgItlOn - avgItlOff,
      },
      tokenOverhead,
      recommendation: qualityImprovement > 0.1 ? 'enable' : 'skip',
      reasoning: `Quality improvement: ${(qualityImprovement * 100).toFixed(1)}%`,
    };
  }

  private async runTest(testCase: ReasoningTestCase, reasoning: boolean): Promise<ReasoningTestResult> {
    const start = Date.now();
    let firstTokenTime = 0;
    let tokenCount = 0;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{
        role: 'user',
        content: testCase.prompt,
      }],
      stream: true,
      // Note: vLLM reasoning parameter when available:
      // reasoning_effort: reasoning ? 'medium' : 'off'
    });

    let fullContent = '';
    for await (const chunk of response) {
      if (firstTokenTime === 0) {
        firstTokenTime = Date.now();
      }
      const delta = chunk.choices[0]?.delta?.content || '';
      fullContent += delta;
      if (delta) tokenCount++;
    }

    const endTime = Date.now();
    const ttftMs = firstTokenTime - start;
    const totalMs = endTime - start;
    const itlMs = tokenCount > 1 ? (totalMs - ttftMs) / (tokenCount - 1) : 0;

    return {
      testCase,
      reasoningEnabled: reasoning,
      answerCorrect: fullContent.toLowerCase().includes(testCase.expectedAnswer.toLowerCase()),
      ttftMs,
      itlMs,
      totalTokens: tokenCount,
      reasoningTokens: reasoning ? Math.floor(tokenCount * 0.3) : undefined, // Estimate
      latencyMs: totalMs,
    };
  }
}
```

- [ ] **Step 4: Run test**

```bash
npx vitest run tests/unit/reasoning-benchmark.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/services/reasoning-benchmark.ts tests/unit/reasoning-benchmark.test.ts
git commit -m "feat: add reasoning benchmark service for quality/latency testing"
```

---

### Task 6: GitHubPublisher Service

**Files:**
- Create: `elastic-llm-benchmarker/src/services/github-publisher.ts`
- Test: `elastic-llm-benchmarker/tests/unit/github-publisher.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd elastic-llm-benchmarker
npm install @octokit/rest
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/unit/github-publisher.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GitHubPublisher } from '../../src/services/github-publisher.js';
import { exec } from 'child_process';
import { promisify } from 'util';

vi.mock('child_process');

const execAsync = promisify(exec);

describe('GitHubPublisher', () => {
  it('should use gh CLI as primary method', async () => {
    vi.mocked(execAsync).mockResolvedValueOnce({ stdout: 'gh version 2.0.0', stderr: '' } as any);
    vi.mocked(execAsync).mockResolvedValueOnce({ stdout: 'Comment posted', stderr: '' } as any);

    const publisher = new GitHubPublisher({
      issueUrl: 'https://github.com/elastic/security-team/issues/15545',
    });

    await publisher.publish('# Test Report');

    expect(execAsync).toHaveBeenCalledWith(expect.stringContaining('gh issue comment'));
  });

  it('should fallback to API when gh CLI unavailable', async () => {
    vi.mocked(execAsync).mockRejectedValueOnce(new Error('gh not found'));

    const publisher = new GitHubPublisher({
      issueUrl: 'https://github.com/elastic/security-team/issues/15545',
      token: 'ghp_test',
    });

    await publisher.publish('# Test Report');
    // Should not throw
  });
});
```

- [ ] **Step 3: Run test**

```bash
npx vitest run tests/unit/github-publisher.test.ts
# Expected: FAIL
```

- [ ] **Step 4: Implement GitHubPublisher**

```typescript
// src/services/github-publisher.ts
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { createLogger } from '../utils/logger.js';

const execAsync = promisify(exec);

interface GitHubPublisherOptions {
  issueUrl: string;
  token?: string;
  logLevel?: string;
}

export class GitHubPublisher {
  private logger;
  private issueUrl: string;
  private token?: string;
  private octokit?: Octokit;

  constructor(options: GitHubPublisherOptions) {
    this.logger = createLogger(options.logLevel || 'info');
    this.issueUrl = options.issueUrl;
    this.token = options.token;

    if (this.token) {
      this.octokit = new Octokit({ auth: this.token });
    }
  }

  async publish(markdown: string): Promise<void> {
    if (await this.isGhCliAvailable()) {
      await this.publishViaGhCli(markdown);
      return;
    }

    if (this.token) {
      await this.publishViaApi(markdown);
      return;
    }

    throw new Error('No GitHub auth available (gh CLI or GITHUB_TOKEN)');
  }

  private async isGhCliAvailable(): Promise<boolean> {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  private async publishViaGhCli(markdown: string): Promise<void> {
    const issueNumber = this.issueUrl.split('/').pop();
    const tempFile = `/tmp/benchmark-report-${Date.now()}.md`;

    await writeFile(tempFile, markdown);

    try {
      await execAsync(
        `gh issue comment ${issueNumber} ` +
        `--repo elastic/security-team ` +
        `--body-file ${tempFile}`
      );
      this.logger.info('Posted via gh CLI', { issueNumber });
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  }

  private async publishViaApi(markdown: string): Promise<void> {
    const [owner, repo, _, issueNumber] = new URL(this.issueUrl).pathname.split('/').filter(Boolean);

    await this.octokit!.rest.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(issueNumber),
      body: markdown,
    });

    this.logger.info('Posted via API', { issueNumber });
  }
}
```

- [ ] **Step 5: Run test**

```bash
npx vitest run tests/unit/github-publisher.test.ts
# Expected: PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/services/github-publisher.ts tests/unit/github-publisher.test.ts package.json package-lock.json
git commit -m "feat: add GitHub publisher with gh CLI primary and API fallback"
```

---

## Phase 2: Orchestration & Queue

### Task 7: Enhanced QueueService with ES Backend

**Files:**
- Modify: `elastic-llm-benchmarker/src/services/queue-service.ts`
- Test: `elastic-llm-benchmarker/tests/integration/queue-processing.test.ts`

- [ ] **Step 1: Check if QueueService exists**

```bash
cd elastic-llm-benchmarker
ls -la src/services/queue-service.ts
```

- [ ] **Step 2: If exists, read current implementation**

```bash
cat src/services/queue-service.ts
```

- [ ] **Step 3: Write integration test for ES-backed queue**

```typescript
// tests/integration/queue-processing.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { QueueService } from '../../src/services/queue-service.js';

describe('QueueService Integration', () => {
  let esClient: Client;
  let queueService: QueueService;

  beforeAll(async () => {
    esClient = new Client({ node: 'http://localhost:9200' });
    queueService = new QueueService(esClient);
    await queueService.initialize();
  });

  afterAll(async () => {
    await esClient.indices.delete({ index: 'benchmarker-queue-test' });
    await esClient.close();
  });

  it('should process priority queue in correct order', async () => {
    await queueService.add({ modelId: 'model-1', priority: 50, requestedBy: 'langgraph' });
    await queueService.add({ modelId: 'model-2', priority: 100, requestedBy: 'user' });
    await queueService.add({ modelId: 'model-3', priority: 50, requestedBy: 'langgraph' });

    const next = await queueService.getNext();
    expect(next?.modelId).toBe('model-2'); // Highest priority
  });

  it('should persist queue across service restarts', async () => {
    await queueService.add({ modelId: 'persistent-model', priority: 75, requestedBy: 'user' });

    // Simulate restart
    const newService = new QueueService(esClient);
    const entry = await newService.get('persistent-model');

    expect(entry).toBeDefined();
  });
});
```

- [ ] **Step 4: Run test with local ES**

```bash
# Start ES if not running
npm run infra:up

# Run test
npx vitest run tests/integration/queue-processing.test.ts
# Expected: FAIL (if QueueService not yet ES-backed)
```

- [ ] **Step 5: Enhance QueueService for ES backend** (if needed)

Add ES-backed storage, priority ordering, status updates

- [ ] **Step 6: Run test to verify pass**

```bash
npx vitest run tests/integration/queue-processing.test.ts
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
git add src/services/queue-service.ts tests/integration/queue-processing.test.ts
git commit -m "feat: enhance queue service with ES-backed durable storage"
```

---

### Task 8: BenchmarkOrchestrationService

**Files:**
- Create: `elastic-llm-benchmarker/src/services/benchmark-orchestration.ts`

- [ ] **Step 1: Implement orchestration service (no test yet - integration tested E2E)**

```typescript
// src/services/benchmark-orchestration.ts
import type { SSHConfig, VMHardwareProfile, BenchmarkThresholds } from '../types/config.js';
import type { ModelInfo, BenchmarkResult } from '../types/benchmark.js';
import type { VllmEngine } from '../engines/vllm-engine.js';
import type { BenchmarkRunnerService } from './benchmark-runner.js';
import type { ToolCallBenchmarkService } from './tool-call-benchmark.js';
import type { ReasoningBenchmarkService } from './reasoning-benchmark.js';
import type { ConfigResearcherService } from './config-researcher.js';
import { createLogger } from '../utils/logger.js';

export interface OrchestrationOptions {
  skipReasoning?: boolean;
  configOverrides?: {
    tensorParallelSize?: number;
    maxModelLen?: number;
  };
}

export class BenchmarkOrchestrationService {
  private logger;

  constructor(
    private configResearcher: ConfigResearcherService,
    private vllmEngine: VllmEngine,
    private benchmarkRunner: BenchmarkRunnerService,
    private toolCallBenchmark: ToolCallBenchmarkService,
    private reasoningBenchmark: ReasoningBenchmarkService,
    logLevel: string = 'info'
  ) {
    this.logger = createLogger(logLevel);
  }

  async orchestrate(
    sshConfig: SSHConfig,
    model: ModelInfo,
    hardwareProfile: VMHardwareProfile,
    thresholds: BenchmarkThresholds,
    options: OrchestrationOptions = {}
  ): Promise<BenchmarkResult> {
    let attemptNumber = 0;
    let config = await this.configResearcher.research(model.id);

    // Apply overrides
    if (options.configOverrides) {
      config = { ...config, ...options.configOverrides };
    }

    while (attemptNumber < 2) {
      try {
        // Deploy
        const deployment = await this.vllmEngine.deploy(sshConfig, model, hardwareProfile);

        // Run benchmarks
        const hardwareMetrics = await this.benchmarkRunner.run(
          sshConfig,
          model.id,
          [1, 4, 16],
          thresholds,
          deployment.deploymentName
        );

        const toolCallResults = await this.toolCallBenchmark.run({
          baseUrl: deployment.apiEndpoint,
          model: model.id,
        });

        let reasoningResults = null;
        if (!options.skipReasoning && config.capabilities.reasoning.supported) {
          reasoningResults = await this.reasoningBenchmark.run();
        }

        // Stop deployment
        await this.vllmEngine.stop(sshConfig, deployment.deploymentName);

        return {
          ...hardwareMetrics,
          toolCallResults,
          reasoningResults,
        };

      } catch (error: any) {
        if (error.category === 'resource_exhausted' && attemptNumber < 1) {
          config.maxModelLen = Math.floor(config.maxModelLen * 0.75);
          this.logger.warn('VRAM OOM - retrying', { newMaxLen: config.maxModelLen });
          attemptNumber++;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/benchmark-orchestration.ts
git commit -m "feat: add benchmark orchestration service with retry logic"
```

---

---

### Task 9: InteractiveOrchestrator

**Files:**
- Create: `elastic-llm-benchmarker/src/agent/interactive-orchestrator.ts`

- [ ] **Step 1: Implement interactive orchestrator**

```typescript
// src/agent/interactive-orchestrator.ts
import type { QueueService } from '../services/queue-service.js';
import type { ConfigResearcherService } from '../services/config-researcher.js';

export interface BenchmarkOptions {
  wait?: boolean;
  progressCallback?: (msg: string) => void;
  configOverrides?: {
    tensorParallelSize?: number;
    maxModelLen?: number;
  };
  skipReasoning?: boolean;
}

export class InteractiveOrchestrator {
  constructor(
    private queueService: QueueService,
    private configResearcher: ConfigResearcherService
  ) {}

  async benchmarkModel(modelId: string, options: BenchmarkOptions = {}) {
    options.progressCallback?.('Researching optimal config...');
    const config = await this.configResearcher.research(modelId);

    if (options.configOverrides) {
      Object.assign(config, options.configOverrides);
    }

    options.progressCallback?.('Adding to priority queue...');
    const queueEntry = await this.queueService.add({
      modelId,
      priority: 100,
      requestedBy: 'user',
      config,
      skipReasoning: options.skipReasoning || false,
    });

    if (options.wait) {
      await this.pollUntilComplete(queueEntry.id, options.progressCallback);
    }

    return queueEntry;
  }

  private async pollUntilComplete(queueId: string, callback?: (msg: string) => void) {
    const POLL_INTERVAL_MS = 5000;
    const MAX_WAIT_MS = 3600000;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime > MAX_WAIT_MS) {
        throw new Error('Benchmark timeout after 1 hour');
      }

      const entry = await this.queueService.get(queueId);

      if (entry.progress?.message) {
        callback?.(entry.progress.message);
      }

      if (entry.status === 'completed') {
        callback?.('✅ Benchmark complete!');
        break;
      }
      if (entry.status === 'failed') {
        throw new Error(`Benchmark failed: ${entry.error?.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/agent/interactive-orchestrator.ts
git commit -m "feat: add interactive orchestrator for on-demand benchmarking"
```

---

### Task 10: Enhance LangGraph Agent

**Files:**
- Modify: `elastic-llm-benchmarker/src/agent/nodes.ts`
- Modify: `elastic-llm-benchmarker/src/agent/graph.ts`

- [ ] **Step 1: Add discover_promising_models node**

Add to `src/agent/nodes.ts`:

```typescript
export async function discoverPromisingModelsNode(state: typeof AgentAnnotation.State) {
  const logger = createLogger('info');
  logger.info('[discover_promising_models] Searching for new models...');

  const hfApi = new HfApi();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch recent models from HuggingFace
  const models = await hfApi.listModels({
    sort: 'likes',
    limit: 100,
    filter: 'text-generation',
  });

  const promising = [];

  for (const model of models) {
    // Skip if already benchmarked
    const exists = await state.resultsStore.exists(model.id);
    if (exists) continue;

    // Check capabilities
    const caps = await state.capabilityDetection.detect(model.id);
    if (!caps.toolCalling.supported && !caps.reasoning.supported) continue;

    // Check if fits hardware
    const config = await state.configResearcher.research(model.id);
    if (config.tensorParallelSize > state.config.hardwareProfile.gpuCount) continue;

    // Score model
    const score =
      (caps.toolCalling.supported ? 30 : 0) +
      (caps.reasoning.supported ? 40 : 0) +
      (model.likes / 1000) +
      (model.downloads / 10000);

    promising.push({ model, score });
  }

  // Add top 5 to queue
  promising
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .forEach(async ({ model }) => {
      await state.queueService.add({
        modelId: model.id,
        priority: 50,
        requestedBy: 'langgraph',
      });
      logger.info('[discover_promising_models] Queued', { modelId: model.id });
    });

  return state;
}
```

- [ ] **Step 2: Wire node into graph**

Add to `src/agent/graph.ts`:

```typescript
import { discoverPromisingModelsNode } from './nodes.js';

const workflow = new StateGraph(AgentAnnotation)
  .addNode('discover_promising_models', discoverPromisingModelsNode)
  // ... existing nodes
  .addEdge('idle', 'discover_promising_models')
  .addEdge('discover_promising_models', 'evaluate_model')
  // ... rest of graph
```

- [ ] **Step 3: Enhance run_benchmark node for reasoning**

Modify `runBenchmarkNode` in `src/agent/nodes.ts`:

```typescript
// Add reasoning benchmark after tool calling
if (state.currentModel.config.capabilities?.reasoning?.supported) {
  const reasoningResults = await state.reasoningBenchmark.run();
  benchmarkResult.reasoningResults = reasoningResults;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/agent/nodes.ts src/agent/graph.ts
git commit -m "feat: enhance LangGraph with autonomous model discovery and reasoning tests"
```

---

## Phase 3: CLI & Interactive Agent

### Task 11: CLI Commands

**Files:**
- Modify: `elastic-llm-benchmarker/src/cli.ts`

- [ ] **Step 1: Add benchmark-model command**

Add to `src/cli.ts` after existing commands:

```typescript
program
  .command('benchmark-model <model-id>')
  .description('Benchmark a specific model (adds to priority queue)')
  .option('--wait', 'Wait and stream progress until completion')
  .option('--tensor-parallel <number>', 'Override tensor parallel size')
  .option('--max-model-len <number>', 'Override max model length')
  .option('--skip-reasoning', 'Skip reasoning tests')
  .action(async (modelId, options) => {
    const config = loadAppConfig(options);
    if (!config) process.exit(1);

    const queueService = new QueueService(createEsClient(config));
    const configResearcher = new ConfigResearcherService({
      gpusAvailable: 2,
      huggingfaceToken: config.huggingface.token,
    });

    // Research config
    console.log('Researching optimal configuration...');
    const researchedConfig = await configResearcher.research(modelId);

    // Add to queue
    const queueEntry = await queueService.add({
      modelId,
      priority: 100,
      requestedBy: 'cli',
      config: {
        ...researchedConfig,
        ...options.tensorParallel && { tensorParallelSize: parseInt(options.tensorParallel) },
        ...options.maxModelLen && { maxModelLen: parseInt(options.maxModelLen) },
      },
      skipReasoning: options.skipReasoning || false,
    });

    console.log(`✓ Added to priority queue`);
    console.log(`  Queue ID: ${queueEntry.id}`);
    console.log(`  Position: #${await queueService.getPosition(queueEntry.id)}`);

    if (options.wait) {
      console.log('\nWaiting for completion...\n');
      await pollUntilComplete(queueService, queueEntry.id);
    } else {
      console.log(`\nCheck status: npx tsx src/cli.ts queue-status ${queueEntry.id}`);
    }
  });

async function pollUntilComplete(queueService, queueId) {
  const POLL_INTERVAL = 5000;
  while (true) {
    const entry = await queueService.get(queueId);

    if (entry.progress) console.log(`⚙️  ${entry.progress.message}`);
    if (entry.status === 'completed') {
      console.log('✅ Complete!');
      break;
    }
    if (entry.status === 'failed') {
      console.error(`❌ Failed: ${entry.error?.message}`);
      process.exit(1);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}
```

- [ ] **Step 2: Add queue-status command**

Add to `src/cli.ts`:

```typescript
program
  .command('queue-status [queue-id]')
  .description('Check queue status (specific entry or all entries)')
  .action(async (queueId, options) => {
    const config = loadAppConfig(options);
    if (!config) process.exit(1);

    const queueService = new QueueService(createEsClient(config));

    if (queueId) {
      const entry = await queueService.get(queueId);
      console.log('Queue Entry:');
      console.log(`  Model: ${entry.modelId}`);
      console.log(`  Status: ${entry.status}`);
      console.log(`  Priority: ${entry.priority}`);
      console.log(`  Submitted: ${entry.submittedAt}`);
      if (entry.startedAt) console.log(`  Started: ${entry.startedAt}`);
      if (entry.progress) console.log(`  Progress: ${entry.progress.message}`);
    } else {
      const entries = await queueService.list();
      console.log(`Queue: ${entries.length} entries`);
      entries.forEach(e => {
        console.log(`  [${e.status}] ${e.modelId} (priority: ${e.priority})`);
      });
    }
  });
```

- [ ] **Step 3: Add vm-status command**

Add to `src/cli.ts`:

```typescript
program
  .command('vm-status')
  .description('Check GPU VM availability')
  .action(async (options) => {
    const config = loadAppConfig(options);
    if (!config) process.exit(1);

    const vmManager = new VMResourceManagerService([{
      id: 'vm-1',
      host: config.ssh.host,
      port: config.ssh.port,
      username: config.ssh.username,
      gpus: '2xA100-40GB',
    }]);

    const status = vmManager.getVMStatus();

    if (status.available.length > 0) {
      console.log('VM Status: AVAILABLE');
      status.available.forEach(vm => {
        console.log(`  ${vm.id}: ${vm.gpus}`);
      });
    } else {
      console.log('VM Status: BUSY');
      status.busy.forEach(vm => {
        console.log(`  ${vm.id}: Running ${vm.modelId}`);
        console.log(`  Started: ${vm.startedAt}`);
      });
    }

    const queueService = new QueueService(createEsClient(config));
    const queueLength = await queueService.count();
    console.log(`\nQueue: ${queueLength} entries`);
  });
```

- [ ] **Step 4: Test all CLI commands**

```bash
cd elastic-llm-benchmarker
npx tsx src/cli.ts benchmark-model --help
npx tsx src/cli.ts queue-status --help
npx tsx src/cli.ts vm-status --help
# Expected: All show help
```

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add benchmark-model, queue-status, and vm-status CLI commands"
```

---

### Task 12: Claude Agent Skill

**Files:**
- Create: `elastic-llm-benchmarker/.claude/skills/benchmark-model/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
cd elastic-llm-benchmarker
mkdir -p .claude/skills/benchmark-model
```

- [ ] **Step 2: Write skill file**

```markdown
---
name: benchmark-model
description: Benchmark OSS models via vLLM with autonomous config research, hardware/tool-calling/reasoning tests, and GitHub reporting
---

# Benchmark Model

Benchmark a specific OSS model on the GPU VM with comprehensive evaluation.

## When to Use

- User wants to benchmark a specific model
- User asks about model performance/capabilities
- User wants to evaluate tool calling or reasoning support

## Process

1. Extract model ID from user query
2. Call ConfigResearcherService to research optimal config
3. Add to priority queue
4. Stream progress as LangGraph processes
5. Show results with GitHub link

## Implementation

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Extract model ID (handle various formats)
let modelId = userQuery;
if (modelId.includes('llama')) modelId = 'meta-llama/Llama-3.3-70B-Instruct';
if (modelId.includes('qwen')) modelId = 'Qwen/Qwen2.5-72B-Instruct';
// Add more model aliases...

// Research config
const result = await execAsync(
  `cd elastic-llm-benchmarker && ` +
  `npx tsx src/cli.ts benchmark-model ${modelId} --wait`
);

// Parse and present results
console.log(result.stdout);
```

## Examples

**User:** "Benchmark Llama 3.3 70B"
**Agent:** Researches config, adds to queue, streams progress, shows results

**User:** "Test if Qwen 3 72B supports tool calling"
**Agent:** Benchmarks model, highlights tool calling results

**User:** "What's in the benchmark queue?"
**Agent:** Runs `queue-status` command, shows current queue
```

- [ ] **Step 3: Test skill invocation**

From Kibana Claude Code:
```
/benchmark-model
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/benchmark-model/SKILL.md
git commit -m "feat: add Claude agent skill for interactive benchmarking"
```

---

## Phase 4: Security & Polish

### Task 13: Credential Detection Hook

**Files:**
- Create: `elastic-llm-benchmarker/scripts/pre-commit-check-credentials.sh`

- [ ] **Step 1: Create script**

```bash
#!/bin/bash
set -e

echo "🔍 Checking for exposed credentials..."

STAGED_FILES=$(git diff --cached --name-only)
if [ -z "$STAGED_FILES" ]; then
  echo "✅ No staged files"
  exit 0
fi

PATTERNS=(
  "ghp_[A-Za-z0-9_]+"
  "hf_[A-Za-z0-9]+"
  "-----BEGIN.*PRIVATE KEY-----"
)

ERRORS=0
for pattern in "${PATTERNS[@]}"; do
  if echo "$STAGED_FILES" | xargs grep -E "$pattern" 2>/dev/null; then
    echo "❌ ERROR: Credential found: $pattern"
    ERRORS=$((ERRORS + 1))
  fi
done

if echo "$STAGED_FILES" | grep -E "\.env$"; then
  echo "❌ ERROR: .env file in staged changes"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo "❌ Found $ERRORS credential exposure(s)"
  exit 1
fi

echo "✅ No credentials found"
exit 0
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/pre-commit-check-credentials.sh
```

- [ ] **Step 3: Install husky**

```bash
npm install --save-dev husky
npx husky install
```

- [ ] **Step 4: Create pre-commit hook**

```bash
npx husky add .husky/pre-commit "./scripts/pre-commit-check-credentials.sh"
```

- [ ] **Step 5: Test hook with fake credential**

```bash
echo "GITHUB_TOKEN=ghp_fake123" > .env.test
git add .env.test
git commit -m "test"
# Expected: FAIL with credential detection error
git reset HEAD .env.test
rm .env.test
```

- [ ] **Step 6: Commit**

```bash
git add scripts/pre-commit-check-credentials.sh .husky/pre-commit package.json
git commit -m "feat: add pre-commit credential detection hook"
```

---

### Task 14: Enhanced .gitignore

- [ ] **Step 1: Enhance .gitignore**

```bash
# Add to elastic-llm-benchmarker/.gitignore
cat >> .gitignore << 'EOF'

# Credentials
.env
.env.local
.env.*.local
*.pem
*.key
id_rsa*

# Reports
reports/
fallback-results/
failed-reports/

# Logs
logs/
*.log
*.jsonl
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: enhance gitignore for credential protection"
```

---

### Task 15: Environment Configuration

- [ ] **Step 1: Update .env.example**

```bash
# Add to elastic-llm-benchmarker/.env.example
cat >> .env.example << 'EOF'

# Golden Cluster (centralized tracking)
ES_GOLDEN_CLOUD_ID=your-deployment-id
ES_GOLDEN_API_KEY=your-golden-api-key

# GitHub Integration
GITHUB_ISSUE_URL=https://github.com/elastic/security-team/issues/15545
# GITHUB_TOKEN=ghp_xxx  # Optional if gh CLI installed
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add golden cluster and GitHub config to env example"
```

---

## Validation Commands

After all tasks:

```bash
# Type check
npm run typecheck

# Run all tests
npm run test

# Test CLI
npx tsx src/cli.ts benchmark-model --help

# Test with small model (if VM available)
npx tsx src/cli.ts benchmark-model Qwen/Qwen2.5-0.5B-Instruct --wait
```

---

## Success Criteria

- [ ] All unit tests pass (50+ tests, 90%+ coverage)
- [ ] Integration tests pass (queue, dual-write)
- [ ] Concurrency tests pass (no race conditions)
- [ ] Security tests pass (credential detection works)
- [ ] CLI command works (`benchmark-model --help`)
- [ ] Claude skill loads (`/benchmark-model` in Kibana)
- [ ] No credentials in git history
- [ ] Documentation complete

---

**Next Steps After Implementation:**
1. Test E2E with real model (Mistral-7B-Instruct)
2. Verify GitHub comment posted to issue #15545
3. Verify dual-write to local + golden clusters
4. Create PR for elastic-llm-benchmarker repo
