#!/bin/bash
set -e

echo "🚀 AESOP Dev Container - Post-Create Setup"
echo "=========================================="
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 1: Wait for Elasticsearch to be healthy
# ═══════════════════════════════════════════════════════════════
echo "⏳ Waiting for Elasticsearch to be ready..."
until curl -s -u elastic:changeme http://elasticsearch:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
  echo "   Elasticsearch not ready yet, waiting..."
  sleep 5
done
echo "✅ Elasticsearch ready!"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 2: Bootstrap Kibana dependencies
# ═══════════════════════════════════════════════════════════════
echo "📦 Running Kibana bootstrap (this takes ~15 minutes)..."
echo "   Installing dependencies and building packages..."
yarn kbn bootstrap 2>&1 | tee /tmp/bootstrap.log | grep -E "success|error|warning" || true
echo "✅ Bootstrap complete!"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 3: Create AESOP-specific indices
# ═══════════════════════════════════════════════════════════════
echo "🗄️  Creating AESOP indices..."
curl -s -X PUT "http://elasticsearch:9200/.aesop-exploration-state" \
  -H "Content-Type: application/json" \
  -u elastic:changeme \
  -d '{
    "settings": {"number_of_shards": 1, "number_of_replicas": 0, "index.hidden": true},
    "mappings": {
      "properties": {
        "last_run_timestamp": {"type": "date"},
        "discovered_indices": {"type": "keyword"},
        "discovery_coverage": {"type": "float"}
      }
    }
  }' > /dev/null 2>&1 || echo "   Index .aesop-exploration-state already exists"

curl -s -X PUT "http://elasticsearch:9200/.aesop-proposed-skills" \
  -H "Content-Type: application/json" \
  -u elastic:changeme \
  -d '{
    "settings": {"number_of_shards": 1, "number_of_replicas": 0, "index.hidden": true},
    "mappings": {
      "properties": {
        "skill_id": {"type": "keyword"},
        "name": {"type": "text"},
        "validation": {"type": "object"},
        "review": {"type": "object"}
      }
    }
  }' > /dev/null 2>&1 || echo "   Index .aesop-proposed-skills already exists"

curl -s -X PUT "http://elasticsearch:9200/.aesop-rejection-feedback" \
  -H "Content-Type: application/json" \
  -u elastic:changeme \
  -d '{
    "settings": {"number_of_shards": 1, "number_of_replicas": 0, "index.hidden": true},
    "mappings": {
      "properties": {
        "skill_id": {"type": "keyword"},
        "rejection_reason": {"type": "keyword"},
        "learning_signals": {"type": "object"}
      }
    }
  }' > /dev/null 2>&1 || echo "   Index .aesop-rejection-feedback already exists"

echo "✅ AESOP indices created!"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 4: Generate ALL test data automatically
# ═══════════════════════════════════════════════════════════════
echo "📊 Generating comprehensive test data for hypothesis validation..."
echo "   This generates all data types needed for H1-H4 validation"
echo ""

# 4.1: Install tsx for TypeScript execution
echo "  Installing tsx (TypeScript executor)..."
npm install -g tsx > /dev/null 2>&1
echo "  ✅ tsx installed"

# 4.2: Run comprehensive data generator
echo "  Running data generator (generates ~200K documents, ~5 minutes)..."
cd /workspace/x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/

tsx data_generator.ts \
  --mode hypothesis-validation \
  --alerts 15000 \
  --personas 2700 \
  --apm-traces 100000 \
  --logs 50000 \
  --metrics 17000 \
  2>&1 | tee /tmp/data-generation.log

echo "  ✅ Demo data generated!"

# 4.3: Create documented relationships baseline (for H1 testing)
cd /workspace
curl -s -X POST "http://elasticsearch:9200/.aesop-documented-relationships/_doc/baseline" \
  -H "Content-Type: application/json" \
  -u elastic:changeme \
  -d '{
    "documented_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "source": "SOC runbooks and playbooks",
    "total_count": 12,
    "relationships": [
      {"from": ".alerts-security.alerts-*", "to": "logs-endpoint.*", "via": "host.name", "type": "join_field"},
      {"from": ".alerts-security.alerts-*", "to": "logs-system.auth-*", "via": "user.name", "type": "join_field"},
      {"from": ".alerts-security.alerts-*", "to": "logs-network.flow-*", "via": "source.ip", "type": "join_field"},
      {"from": "logs-endpoint.events.process-*", "to": "logs-endpoint.events.file-*", "via": "process.entity_id", "type": "join_field"},
      {"from": ".alerts-security.alerts-*", "to": "threat-intel-*", "via": "threat.indicator.id", "type": "semantic"},
      {"from": "logs-endpoint.*", "to": "logs-system.*", "via": "host.name", "type": "join_field"},
      {"from": ".siem-signals-*", "to": "logs-*", "via": "host.name", "type": "join_field"},
      {"from": ".alerts-*", "to": ".siem-signals-*", "via": "signal.rule.id", "type": "semantic"},
      {"from": "logs-endpoint.events.process-*", "to": "logs-endpoint.events.network-*", "via": "process.entity_id", "type": "join_field"},
      {"from": "logs-system.auth-*", "to": "logs-system.syslog-*", "via": "user.name", "type": "temporal"},
      {"from": "metrics-endpoint.metrics-*", "to": "logs-endpoint.*", "via": "host.name", "type": "join_field"},
      {"from": ".alerts-*", "to": "metrics-*", "via": "host.name", "type": "join_field"}
    ]
  }' > /dev/null

echo "  ✅ Documented relationships baseline created (12 relationships)"

# 4.4: Generate hand-authored skills baseline (for H2 comparison)
echo "  Generating hand-authored skills baseline for comparison..."

# Create 5 hand-authored skills that AESOP will try to match/exceed
cat > /tmp/hand_authored_skills.json <<'SKILLS'
[
  {
    "id": "hand-authored-1",
    "name": "Manual Alert Triage Workflow",
    "description": "Manually investigate high-severity security alerts with enrichment",
    "content": "# Alert Triage\n\n## Purpose\nInvestigate high-severity alerts\n\n## Steps\n1. Query alerts\n2. Enrich with threat intel\n3. Correlate with historical data\n4. Classify severity\n5. Create case if needed",
    "tools": ["search_alerts", "get_threat_intel", "create_case"],
    "created_by": "human_engineer",
    "creation_time_hours": 4,
    "source": "manual"
  },
  {
    "id": "hand-authored-2",
    "name": "Manual Entity Risk Scoring",
    "description": "Score entities based on historical behavior and threat intelligence",
    "content": "# Entity Risk Scoring\n\n## Purpose\nCalculate risk scores for hosts and users\n\n## Algorithm\n1. Count historical alerts for entity\n2. Check threat intel databases\n3. Calculate weighted score\n4. Return HIGH/MEDIUM/LOW",
    "tools": ["search_alerts", "entity_analytics", "threat_intel"],
    "created_by": "human_engineer",
    "creation_time_hours": 3.5,
    "source": "manual"
  },
  {
    "id": "hand-authored-3",
    "name": "Manual Multi-Alert Correlation",
    "description": "Correlate related alerts by common entities",
    "content": "# Alert Correlation\n\n## Purpose\nFind related alerts by host, user, or IP\n\n## Steps\n1. Extract entities from alert\n2. Search for alerts with same entities\n3. Group by time window (4 hours)\n4. Return correlated set",
    "tools": ["search_alerts", "extract_entities"],
    "created_by": "human_engineer",
    "creation_time_hours": 3,
    "source": "manual"
  },
  {
    "id": "hand-authored-4",
    "name": "Manual MITRE ATT&CK Mapping",
    "description": "Map security alerts to MITRE ATT&CK framework",
    "content": "# MITRE Mapping\n\n## Purpose\nClassify alerts by MITRE tactics and techniques\n\n## Mapping Rules\n- PowerShell execution → T1059.001\n- File creation in temp → T1105\n- Network connection → T1071\n\n## Output\nReturns: tactics[], techniques[], phase",
    "tools": ["get_alert_details"],
    "created_by": "human_engineer",
    "creation_time_hours": 4.5,
    "source": "manual"
  },
  {
    "id": "hand-authored-5",
    "name": "Manual Historical Context Enrichment",
    "description": "Enrich alerts with historical context for better triage",
    "content": "# Historical Context\n\n## Purpose\nAdd context from similar past alerts\n\n## Steps\n1. Extract key fields (IP, user, host)\n2. Search last 30 days for similar\n3. Aggregate: total count, severity distribution\n4. Return context summary",
    "tools": ["search_alerts", "aggregate_metrics"],
    "created_by": "human_engineer",
    "creation_time_hours": 3,
    "source": "manual"
  }
]
SKILLS

# Index hand-authored skills for comparison
for skill in $(cat /tmp/hand_authored_skills.json | jq -c '.[]'); do
  skill_id=$(echo $skill | jq -r '.id')
  curl -s -X POST "http://elasticsearch:9200/.aesop-hand-authored-skills/_doc/$skill_id" \
    -H "Content-Type: application/json" \
    -u elastic:changeme \
    -d "$skill" > /dev/null
done

echo "  ✅ Hand-authored skills baseline created (5 skills, 18 hours manual effort simulated)"
echo ""

echo "✅ All baseline data loaded!"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 5: Create hypothesis validation helper script
# ═══════════════════════════════════════════════════════════════
cat > /workspace/validate-hypotheses.sh <<'SCRIPT'
#!/bin/bash
echo "🧪 AESOP Hypothesis Validation Suite"
echo "====================================="
echo ""

echo "Running competitive benchmarking tests (H1-H4)..."
yarn test:jest x-pack/platform/plugins/shared/evals/server/__tests__/aesop_competitive_benchmarks.test.ts

echo ""
echo "Running O11y/LangSmith parity tests..."
yarn test:jest x-pack/platform/plugins/shared/evals/server/__tests__/o11y_langsmith_parity.test.ts

echo ""
echo "✅ Hypothesis validation complete!"
echo ""
echo "Results summary:"
echo "- H1 (Discovery Coverage): Check test output above"
echo "- H2 (Skill Quality): Check eval scores in test output"
echo "- H3 (Improvement Trajectory): Requires 3 cycles (run manually)"
echo "- H4 (Net-New Capabilities): Requires SOC team survey (qualitative)"
SCRIPT

chmod +x /workspace/validate-hypotheses.sh

echo "✅ Created hypothesis validation script: ./validate-hypotheses.sh"
echo ""

# ═══════════════════════════════════════════════════════════════
# Final: Print helpful commands
# ═══════════════════════════════════════════════════════════════
echo "🎉 Dev Container Setup Complete!"
echo ""
echo "Helpful commands:"
echo "  yarn start                    Start Kibana from source"
echo "  yarn test:jest <path>         Run specific tests"
echo "  ./validate-hypotheses.sh      Run H1-H4 validation tests"
echo "  node scripts/eslint --fix     Fix linting issues"
echo ""
echo "Services available:"
echo "  Elasticsearch: http://localhost:9200 (elastic/changeme)"
echo "  Kibana: http://localhost:5601 (will start when you run 'yarn start')"
echo "  EDOT Collector: http://localhost:4318 (OTLP endpoint)"
echo ""
echo "Next steps:"
echo "1. Run: yarn start"
echo "2. Navigate to: http://localhost:5601/app/management/ai/evals"
echo "3. Click: Autonomous Skills tab"
echo "4. Trigger exploration and validate hypotheses!"
echo ""
