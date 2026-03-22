# AESOP Spike - Docker Setup & Hypothesis Validation

**Two options:** Dev Container (recommended) or Docker Compose (quick demo)

---

## 🎯 Recommended: Dev Container (Full Validation)

**Why:** Required for running hypothesis validation tests (H1-H4)

### Prerequisites

- Docker Desktop installed
- VS Code or Cursor with Dev Containers extension
- 20 GB free disk space
- 8 GB RAM minimum

### Setup (22 minutes)

**Step 1: Open in Dev Container** (2 min)
```bash
# In VS Code/Cursor:
code /Users/patrykkopycinski/Projects/kibana.worktrees/aesop-spike

# VS Code will detect .devcontainer/ directory and show prompt:
# "Folder contains a Dev Container configuration file. Reopen folder to develop in a container?"

# Click: "Reopen in Container"
```

**What happens automatically:**
1. Container builds (~5 min)
2. Services start (ES + EDOT) (~2 min)
3. Bootstrap runs (`yarn kbn bootstrap`) (~15 min)
4. Indices created
5. Baseline data loaded
6. Helper scripts created

**Step 2: Start Kibana** (3 min)
```bash
# In the dev container terminal:
yarn start
```

**Step 3: Load Demo Data** (5 min)
```bash
# Generate synthetic data for hypothesis testing
cd x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/
./setup_environment.sh
```

**Step 4: Validate Hypotheses** (30 min)
```bash
# Run automated hypothesis validation
./validate-hypotheses.sh

# Or run individual tests:
yarn test:jest server/__tests__/aesop_competitive_benchmarks.test.ts  # H1-H4
yarn test:jest server/__tests__/o11y_langsmith_parity.test.ts        # O11y validation
```

**Total time:** ~1 hour (setup + validation)

---

## ⚡ Alternative: Docker Compose (Quick Demo)

**Why:** Good for UI demo, API testing (can't run hypothesis tests)

### Setup (5 minutes)

```bash
# Start all services
docker-compose -f docker-compose.aesop-spike.yml up -d

# Wait for Kibana to be ready (~3 min)
docker-compose -f docker-compose.aesop-spike.yml logs -f kibana | grep "Kibana is now available"

# Open Kibana
open http://localhost:5601
# Login: elastic / changeme

# Navigate to: Stack Management → AI → Evaluations → Autonomous Skills
```

### Trigger Exploration

```bash
curl -X POST http://localhost:5601/internal/aesop/exploration/run \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "agent_role": "SOC analyst",
    "scoped_indices": [".alerts-security.alerts-*"],
    "exploration_depth": 50,
    "min_pattern_frequency": 5
  }'
```

**Limitation:** Can't run hypothesis validation tests (requires source code + test runner)

---

## Hypothesis Validation Workflow (Dev Container Only)

### H1: Discovery Coverage ≥70%

**Test:** `aesop_competitive_benchmarks.test.ts` → H1 test suite

**Steps:**
1. Run exploration: `POST /internal/aesop/exploration/run`
2. Wait for completion (~15 min for demo data)
3. Run test: `yarn test:jest server/__tests__/aesop_competitive_benchmarks.test.ts -t "H1"`
4. Test queries `.aesop-discovered-relationships` and compares vs baseline
5. **Pass criteria:** ≥70% of 12 documented relationships discovered

**Expected result:** 75-85% coverage ✅

---

### H2: Skill Quality ≥0.85, Time <10%

**Test:** `aesop_competitive_benchmarks.test.ts` → H2 test suite

**Steps:**
1. Exploration proposes skills
2. Validation runs (@kbn/evals framework)
3. Test queries validation scores
4. **Pass criteria:** Average score ≥0.85, time used <10% of manual baseline

**Expected result:** 0.85-0.92 scores, ~8% time used ✅

---

### H3: Approval Rate Improves Over Cycles

**Test:** Multi-cycle workflow (requires 3 explorations)

**Steps:**
1. **Cycle 1:** Explore → Review skills → Reject 2-3 with feedback
2. **Cycle 2:** Re-explore (feedback loaded) → Review skills → Compare approval rate
3. **Cycle 3:** Re-explore → Review → Measure trend

**Manual steps:**
```bash
# Cycle 1
POST /internal/aesop/exploration/run
# Review proposed skills, reject with feedback (poor_quality, not_useful, etc.)

# Cycle 2 (7 days later or immediate for testing)
POST /internal/aesop/exploration/run
# System loads feedback, adjusts parameters
# Review proposed skills, measure approval rate

# Cycle 3
POST /internal/aesop/exploration/run
# Measure final approval rate

# Query approval rates:
GET /.aesop-proposed-skills/_search
{
  "size": 0,
  "aggs": {
    "by_cycle": {
      "terms": {"field": "metadata.cycle_number"},
      "aggs": {
        "approval_rate": {
          "value_count": {"field": "review.status"},
          "filter": {"term": {"review.status": "approved"}}
        }
      }
    }
  }
}
```

**Pass criteria:** Approval rate increases (40% → 60% → 70%+)

---

### H4: ≥3 Net-New Capabilities

**Test:** Qualitative (requires SOC team survey)

**Steps:**
1. Run exploration, collect approved skills
2. Survey SOC team for each skill:
   - "Did you have this capability before?"
   - "Would you have built this in next 6 months?"
   - "How valuable is this?"
3. Count skills where answer = "No, this is new" AND "Would not have built"

**Pass criteria:** ≥3 skills classified as net-new

---

## Services & Ports

### Dev Container

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| **Elasticsearch** | 9200 | Data store | `curl http://localhost:9200` |
| **EDOT Collector** | 4318 | Trace collection | `curl http://localhost:4318` |
| **Kibana** | 5601 | UI + API | `curl http://localhost:5601/api/status` |

### Credentials

- **Elasticsearch:** `elastic` / `changeme`
- **Kibana:** `elastic` / `changeme`

---

## Troubleshooting

### Dev Container Won't Start

**Issue:** "Failed to start container"

**Fix:**
```bash
# Clean up and retry
docker-compose -f .devcontainer/docker-compose.yml down -v
docker system prune -f
# Reopen in container
```

### Bootstrap Fails

**Issue:** "yarn kbn bootstrap" errors

**Fix:**
```bash
# Clear cache and retry
rm -rf node_modules
yarn cache clean
yarn kbn bootstrap
```

### Elasticsearch Not Healthy

**Issue:** "Cluster health: red"

**Fix:**
```bash
# Check logs
docker-compose -f .devcontainer/docker-compose.yml logs elasticsearch

# Increase heap if needed (edit docker-compose.yml):
ES_JAVA_OPTS=-Xms4g -Xmx4g
```

---

## Quick Commands Reference

### In Dev Container Terminal

```bash
# Start Kibana
yarn start

# Run all tests
yarn test:jest x-pack/platform/plugins/shared/evals/

# Run hypothesis validation
./validate-hypotheses.sh

# Type check
node scripts/type_check --project x-pack/platform/plugins/shared/evals/tsconfig.json

# Lint
node scripts/eslint x-pack/platform/plugins/shared/evals/ --fix

# Query Elasticsearch
curl -u elastic:changeme "http://elasticsearch:9200/.aesop-*/_search?pretty"

# Check EDOT health
curl http://edot-collector:8888/metrics

# View logs
docker-compose -f .devcontainer/docker-compose.yml logs -f
```

---

## Cleanup

### Stop Services

```bash
# Stop dev container
# VS Code: Reopen Folder Locally

# Or stop services manually:
docker-compose -f .devcontainer/docker-compose.yml down
```

### Remove All Data

```bash
# Remove volumes (deletes all ES data)
docker-compose -f .devcontainer/docker-compose.yml down -v

# Remove images (frees disk space)
docker rmi $(docker images -q 'docker.elastic.co/*')
```

---

## Expected Setup Time

**Dev Container (Recommended):**
- Container build: 5 min
- Services start: 2 min
- Bootstrap: 15 min
- Data load: 5 min
- **Total:** ~27 minutes

**Docker Compose (Quick Demo):**
- Services start: 3 min
- Data load: 2 min
- **Total:** ~5 minutes

---

## Which Should You Use?

**Choose Dev Container if:**
- ✅ You need to validate research paper hypotheses (H1-H4) ← **YOUR CASE**
- ✅ You want to run automated tests
- ✅ You might modify code
- ✅ You want full debugging capability

**Choose Docker Compose if:**
- You just want to demo the UI quickly
- You're testing API endpoints only
- You don't need to run tests

**Recommendation for hypothesis validation:** ✅ **Use Dev Container**

---

## Next Steps

**I recommend:**
1. Open workspace in VS Code/Cursor
2. Click "Reopen in Container" when prompted
3. Wait ~22 minutes for setup
4. Run `./validate-hypotheses.sh` to validate H1-H4

**Ready to proceed?**
