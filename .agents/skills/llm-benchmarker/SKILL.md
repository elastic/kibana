---
name: LLM Benchmarker
description: Deploy vLLM models and run benchmarks using elastic-llm-benchmarker. Use when you need to deploy a model for @kbn/evals, evaluate model tool-calling, or benchmark throughput/latency.
---

# LLM Benchmarker

Use this skill when:

- You need to **deploy a vLLM model** on the GPU VM for testing or `@kbn/evals` runs
- You need to **benchmark** a model's throughput, latency, or tool-calling capabilities
- You need to **enqueue a model** for automated evaluation
- You need to **check benchmark results** or model status

## Prerequisites

The benchmarker lives at `elastic-llm-benchmarker/` (symlinked from the main repo). If the symlink is missing:

```bash
BENCHMARKER="$HOME/Projects/automaker/elastic-llm-benchmarker"
[ -e "elastic-llm-benchmarker" ] || ln -s "$BENCHMARKER" elastic-llm-benchmarker
```

The benchmarker requires a configured `.env` file. Check if it exists before running commands:

```bash
ls elastic-llm-benchmarker/.env
```

## Workflows

### 1. Deploy a Model for `@kbn/evals`

When you need a running model endpoint for Kibana evaluation tests:

```bash
cd elastic-llm-benchmarker

# Print the vLLM docker run command (dry run)
npx tsx src/cli.ts print-deploy-command \
  --model <model-id> \
  --port 8000

# Deploy model AND run tool-call benchmark in one step
npx tsx src/cli.ts deploy-and-test-tool-calls \
  --model <model-id> \
  --port 8000 \
  --no-stop  # keep the container running after tests
```

The `--no-stop` flag is critical for `@kbn/evals` — it keeps the vLLM container running after the tool-call tests complete so the model remains available.

After deployment, the model is accessible at `http://<SSH_HOST>:8000/v1` (OpenAI-compatible API).

To expose the model publicly (for Kibana connectors that can't reach the VM directly), enable the tunnel in `.env`:

```
TUNNEL_ENABLED=true
NGROK_AUTH_TOKEN=<token>
```

### 2. Run Tool-Call Benchmark Against a Running Model

When a model is already deployed and you want to validate tool-calling:

```bash
cd elastic-llm-benchmarker
npx tsx src/cli.ts tool-call-benchmark \
  --base-url http://<host>:8000 \
  --model <model-id>
```

This runs sequential and parallel tool-call tests and reports success rates.

### 3. Enqueue a Model for Automated Evaluation

Start the Queue API, then submit a model:

```bash
cd elastic-llm-benchmarker

# Start Queue API (port 3100)
npx tsx src/api/queue-server.ts &

# Enqueue a model
curl -X POST http://localhost:3100/api/queue \
  -H "Content-Type: application/json" \
  -d '{"modelId": "<model-id>", "priority": 100}'
```

The LangGraph agent (`npm run dev`) picks up queued models and runs the full pipeline: deploy → benchmark → store results → create Kibana connector → run eval.

### 4. Check Status and Results

```bash
cd elastic-llm-benchmarker

# Check ES status, result counts, queue state
npx tsx src/cli.ts status

# Query results for a specific model
npx tsx src/cli.ts results --model <model-id> --summary

# Export results
npx tsx src/cli.ts export --format csv --output results.csv
```

### 5. Start Local Elasticsearch + Kibana (for Dashboards)

```bash
cd elastic-llm-benchmarker

# Start ES + Kibana
npm run infra:up

# Create Kibana dashboards and visualizations
python3 scripts/create-kibana-objects.py

# Access dashboards at http://localhost:5601 (elastic/changeme)
```

## Model ID Format

Model IDs follow HuggingFace naming: `org/model-name`, e.g.:
- `meta-llama/Llama-3.3-70B-Instruct`
- `Qwen/Qwen3-4B`
- `mistralai/Devstral-Small-2505`
- `NousResearch/Hermes-3-Llama-3.1-8B`

## Connecting to `@kbn/evals`

After deploying a model with the benchmarker, create a Kibana connector that points to the vLLM endpoint:

1. Deploy the model: `npx tsx src/cli.ts deploy-and-test-tool-calls --model <id> --port 8000 --no-stop`
2. The vLLM API is at `http://<SSH_HOST>:8000/v1`
3. In Kibana, create an OpenAI connector pointing to that URL, or configure it in `kibana.dev.yml`:

```yaml
xpack.actions.preconfigured:
  vllm-local:
    name: 'vLLM Local'
    actionTypeId: .gen-ai
    config:
      apiProvider: 'Other'
      apiUrl: 'http://<SSH_HOST>:8000/v1/chat/completions'
      defaultModel: '<model-id>'
    secrets:
      apiKey: 'not-needed'
```

4. Run `@kbn/evals` with the connector:

```bash
KIBANA_TESTING_AI_CONNECTORS='[{"id":"vllm-local"}]' \
  npx playwright test --project vllm-local
```

## Environment Variables

Key settings in `elastic-llm-benchmarker/.env`:

| Variable | Description |
|----------|-------------|
| `SSH_HOST` | GPU VM IP address |
| `SSH_USERNAME` / `SSH_PASSWORD` | VM credentials |
| `HUGGINGFACE_TOKEN` | HuggingFace API token for model discovery |
| `ENGINE_TYPE` | `vllm` (default) or `ollama` |
| `TUNNEL_ENABLED` | `true` to expose via ngrok |
| `ES_URL` / `ES_API_KEY` | Elasticsearch connection for results storage |

## Guardrails

- Always use `--no-stop` when deploying for `@kbn/evals` — the model must stay running
- Check `npx tsx src/cli.ts status` before deploying to see if a model is already running
- Large models (70B+) require multi-GPU VMs; check `HARDWARE_PROFILE_ID` in `.env`
- The VM has limited disk; old containers should be cleaned up after use
