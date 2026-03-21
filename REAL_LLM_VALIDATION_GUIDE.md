# Real LLM Validation - Step-by-Step Guide

**Status**: Ready to execute (requires GPU VM access)
**Model**: Qwen 2.5 7B Instruct
**Estimated Time**: 30-45 minutes

---

## Quick Start (Copy-Paste Ready)

### Step 1: Deploy Model on GPU VM (5-10 minutes)

```bash
# SSH to GPU VM
ssh patrykkopycinski@35.227.122.63

# Run vLLM container
docker run -d \
  --name vllm-qwen-2.5-7b \
  --gpus all \
  --shm-size=16g \
  -p 8000:8000 \
  -e HF_TOKEN=${HF_TOKEN} \
  vllm/vllm-openai:v0.15.1 \
  --model Qwen/Qwen2.5-7B-Instruct \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 32768 \
  --tool-call-parser hermes \
  --enable-auto-tool-choice

# Wait for model to load (~5 minutes)
docker logs -f vllm-qwen-2.5-7b

# Look for: "Application startup complete"
# Then: Ctrl+C to exit logs
```

**Verify deployment**:
```bash
curl http://35.227.122.63:8000/v1/models
# Should return: {"data": [{"id": "Qwen/Qwen2.5-7B-Instruct", ...}]}
```

---

### Step 2: Start Kibana (if not running) (3-5 minutes)

```bash
# In kibana directory
cd /Users/patrykkopycinski/Projects/kibana/.worktrees/incremental-ad

# Start Kibana
yarn start

# Wait for: "http server running at http://0.0.0.0:5601"
```

---

### Step 3: Create Kibana Connector (2 minutes)

```bash
# Create Gen AI connector pointing to vLLM
curl -X POST "http://localhost:5601/api/actions/connector" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "name": "Qwen 2.5 7B - vLLM",
    "connector_type_id": ".gen-ai",
    "config": {
      "apiUrl": "http://35.227.122.63:8000/v1/chat/completions",
      "apiProvider": "Other",
      "defaultModel": "Qwen/Qwen2.5-7B-Instruct"
    },
    "secrets": {
      "apiKey": "not-needed-for-vllm"
    }
  }'

# SAVE THE CONNECTOR ID from the response!
# Example response: {"id": "abc-123-def-456", ...}
```

**Save this ID** - you'll need it for validation:
```bash
CONNECTOR_ID="<paste-id-here>"
```

---

### Step 4: Run Automated Validation (5-10 minutes)

```bash
cd x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/scripts

# Make sure scripts are executable
chmod +x *.sh

# Run validation suite
./validate_with_real_llm.sh $CONNECTOR_ID qwen-2.5-7b
```

**Expected Output**:

```
╔════════════════════════════════════════════════════════╗
║ Incremental AD Validation - Real LLM                  ║
╚════════════════════════════════════════════════════════╝

Connector ID: abc-123-def-456
Model: qwen-2.5-7b
Kibana: http://localhost:5601

=== Test 1: Delta Mode - Initial Run (100 alerts) ===
✓ Execution UUID: 550e8400-e29b-41d4-a716-446655440000
Waiting for generation to complete...
Results:
  Delta size: 100 alerts (expected: 100)
  Total rounds: 2 (expected: 2)
  Max context: ~5500 tokens (limit: 8000)
✅ Test 1 PASSED

=== Test 2: Delta Mode - Incremental Run (only NEW alerts) ===
✓ Execution UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
Results:
  Delta size: 15 alerts (expected: <20)
  Efficiency: 15% new (target: <20%)
✅ Test 2 PASSED - Delta mode efficient

=== Test 3: Progressive Mode - 200 Alerts ===
✓ Execution UUID: 6ba7b814-9dad-11d1-80b4-00c04fd430c8
Results:
  Total rounds: 4 (expected: 4)
  Alerts processed: 200 (expected: 200)
  Max context: ~7000 tokens (limit: 8000)
✅ Test 3 PASSED

╔════════════════════════════════════════════════════════╗
║ Validation Summary                                     ║
╚════════════════════════════════════════════════════════╝

✅ Delta Mode - Initial Run: PASSED
✅ Delta Mode - Incremental: PASSED
✅ Progressive Mode - 200 Alerts: PASSED

Model: qwen-2.5-7b
All tests completed successfully! ✅
```

---

### Step 5: Review Results in Kibana (5 minutes)

1. **View Telemetry**:
   ```bash
   # Check telemetry events
   curl -X GET "http://localhost:9200/.kibana-event-log-*/_search" \
     -u elastic:changeme \
     -H "Content-Type: application/json" \
     -d '{
       "query": {
         "prefix": { "event.type": "incremental_attack_discovery" }
       },
       "size": 10,
       "sort": [{ "@timestamp": "desc" }]
     }' | jq '.hits.hits[]._source | {
       type: .event.type,
       mode: .mode,
       rounds: .totalRounds,
       alerts: .totalAlertsProcessed,
       deltaSize: .deltaSize,
       context: .contextBudgetPerRound,
       success: .success
     }'
   ```

2. **Check Dashboard** (if imported):
   - Navigate to: http://localhost:5601/app/dashboards
   - Find: "Incremental Attack Discovery Monitoring"
   - Verify: Context budget <8K, Delta efficiency <20%

---

### Step 6: Fill Out Validation Report (10 minutes)

```bash
cd x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental

# Edit VALIDATION_REPORT.md with actual results
# Fill in all [X] placeholders with real metrics
```

**Key metrics to document**:
- Delta size (Run 1 vs Run 2)
- Context budget per round
- Success rate
- Duration per scenario
- Insight quality assessment

---

## Alternative: Mock Validation (For Testing)

If you don't have GPU access right now, validate with mock LLM:

```bash
cd elastic-llm-benchmarker
npx tsx src/cli.ts tool-call-benchmark \
  --base-url http://localhost:11434 \  # Ollama
  --model qwen2.5:7b \
  --mock

# Or use the integration test suite
cd /Users/patrykkopycinski/Projects/kibana/.worktrees/incremental-ad
yarn test:jest incremental/__tests__/incremental_ad.integration.test.ts
```

---

## Troubleshooting

### Model Won't Deploy

**Check GPU availability**:
```bash
ssh patrykkopycinski@35.227.122.63
nvidia-smi
```

**Check Docker**:
```bash
docker ps -a | grep vllm
docker logs vllm-qwen-2.5-7b
```

### Kibana Not Starting

```bash
# Check if already running
lsof -i :5601

# Start if needed
yarn start
```

### Connector Creation Fails

**Check Kibana is accessible**:
```bash
curl -u elastic:changeme http://localhost:5601/api/status
```

**List existing connectors**:
```bash
curl -X GET "http://localhost:5601/api/actions/connectors" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme | jq .
```

---

## Success Criteria

Validation passes if:

✅ **All 3 automated tests pass**
✅ **Context budget <8K in all scenarios**
✅ **Delta efficiency <20% on Run 2**
✅ **Success rate 100% (no LLM errors)**
✅ **Insights are coherent (manual review)**
✅ **Telemetry events captured correctly**

---

## Time Estimate

- Model deployment: 5-10 minutes
- Validation execution: 5-10 minutes
- Results review: 5 minutes
- Report writing: 10 minutes

**Total**: 30-45 minutes

---

## Commands Reference Card

```bash
# 1. Deploy model
ssh user@35.227.122.63 "docker run -d --name vllm-qwen2.5-7b --gpus all -p 8000:8000 ..."

# 2. Test model
curl http://35.227.122.63:8000/v1/models

# 3. Create connector
curl -X POST localhost:5601/api/actions/connector ... | jq -r '.id'

# 4. Run validation
./validate_with_real_llm.sh $CONNECTOR_ID qwen-2.5-7b

# 5. View results
curl localhost:9200/.kibana-event-log-*/_search ... | jq .
```

---

**This guide provides everything needed to run real LLM validation in ~30 minutes.**
