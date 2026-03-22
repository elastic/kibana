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
# Step 4: Load baseline data for hypothesis testing
# ═══════════════════════════════════════════════════════════════
echo "📊 Loading baseline data for hypothesis validation..."

# Create documented relationships baseline (for H1 testing)
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

echo "✅ Baseline data loaded!"
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
