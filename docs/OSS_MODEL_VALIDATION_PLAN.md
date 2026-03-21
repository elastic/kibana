# OSS Model Validation Plan for Batch Processing

**Goal:** Validate that `@kbn/llm-batch-processing` enables OSS models to handle large alert datasets that would otherwise exceed context limits.

---

## Ollama Models for Testing

### Available via Ollama (Tool Calling Supported)

| Model | Ollama ID | Context | Tool Calling | Test Priority |
|-------|-----------|---------|--------------|---------------|
| **Llama 3.1 8B** | `llama3.1:8b` | 131K | ✅ Yes | **#1** - Production ready |
| **Llama 3.2 3B** | `llama3.2:3b` | 131K | ✅ Yes | #2 - Smaller, faster |
| **Qwen 2.5 7B** | `qwen2.5:7b` | 32K | ✅ Yes | **#3** - Smaller context (good test) |
| **Qwen 2.5 14B** | `qwen2.5:14b` | 32K | ✅ Yes | #4 - Better quality |
| **Mistral 7B** | `mistral:7b` | 32K | ✅ Yes | #5 - Popular OSS model |
| **Gemma 2 9B** | `gemma2:9b` | 8K | ✅ Yes | **#6** - Smallest context (stress test) |

### Setup Commands

```bash
# Install Ollama (if not installed)
brew install ollama

# Pull models
ollama pull llama3.1:8b
ollama pull qwen2.5:7b
ollama pull mistral:7b
ollama pull gemma2:9b

# Start Ollama server (OpenAI-compatible API)
ollama serve &  # Runs on http://localhost:11434
```

---

## Test Matrix

### Scenario 1: Small Context Stress Test (Gemma 2 9B, 8K context)

**Model:** `gemma2:9b` (8K = ~6,000 tokens usable)
**Dataset:** 100-alert dataset (~40K tokens if sent at once)

**Expected:**
- ❌ **Baseline fails:** Context overflow or severe truncation
- ✅ **Treatment succeeds:** 10 batches × 4K tokens/batch = fits in 8K context

**Validation:** Proves batch processing enables tiny models

### Scenario 2: Medium Context (Qwen/Mistral 7B, 32K context)

**Models:** `qwen2.5:7b`, `mistral:7b`
**Dataset:** 200-300 alert dataset (~80-120K tokens)

**Expected:**
- ⚠️ **Baseline struggles:** Near context limit, quality degrades
- ✅ **Treatment works well:** 20-30 batches, well under limit per batch

**Validation:** Proves batch processing gives quality headroom

### Scenario 3: Large Context (Llama 3.1 8B, 131K context)

**Model:** `llama3.1:8b`
**Dataset:** 500-alert dataset (~200K tokens - exceeds even 131K)

**Expected:**
- ❌ **Baseline fails:** Exceeds 131K context limit
- ✅ **Treatment succeeds:** 50 batches × 4K tokens/batch = fits

**Validation:** Proves scalability to production workloads

---

## Recommended Validation Sequence

**Quick Win (30 minutes):**
1. Pull `qwen2.5:7b` (fast download, 32K context)
2. Add Ollama connector to kibana.dev.yml
3. Run 100-alert baseline (should fail/degrade)
4. Run 100-alert treatment (should succeed)

**Comprehensive (2 hours):**
1. Pull all 4 models (llama3.1:8b, qwen2.5:7b, mistral:7b, gemma2:9b)
2. Test each with 100, 200, 500 alert datasets
3. Compare quality, latency, success rate
4. Generate OSS compatibility matrix

---

## Ollama Connector Configuration

Add to `config/kibana.dev.yml`:

```yaml
xpack.actions.preconfigured:
  ollama-qwen25-7b:
    actionTypeId: .gen-ai
    name: Qwen 2.5 7B (Ollama)
    config:
      apiUrl: 'http://localhost:11434/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: qwen2.5:7b
    secrets:
      apiKey: 'dummy'

  ollama-llama31-8b:
    actionTypeId: .gen-ai
    name: Llama 3.1 8B (Ollama)
    config:
      apiUrl: 'http://localhost:11434/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: llama3.1:8b
    secrets:
      apiKey: 'dummy'

  ollama-mistral-7b:
    actionTypeId: .gen-ai
    name: Mistral 7B (Ollama)
    config:
      apiUrl: 'http://localhost:11434/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: mistral:7b
    secrets:
      apiKey: 'dummy'

  ollama-gemma2-9b:
    actionTypeId: .gen-ai
    name: Gemma 2 9B (Ollama)
    config:
      apiUrl: 'http://localhost:11434/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: gemma2:9b
    secrets:
      apiKey: 'dummy'
```

---

## Expected Timeline

| Task | Duration |
|------|----------|
| Pull 4 models via Ollama | 20-40 min (parallel downloads) |
| Configure connectors | 5 min |
| Run baseline tests (4 models × 3 datasets) | 1 hour |
| Run treatment tests (4 models × 3 datasets) | 1.5 hours |
| Generate OSS validation report | 15 min |
| **Total** | **3-4 hours** |

---

**Want me to start pulling the models and setting up Ollama connectors?**