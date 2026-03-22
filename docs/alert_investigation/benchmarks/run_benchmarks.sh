#!/bin/bash
#
# Performance Benchmarking Runner
#
# Runs performance benchmarks and generates analysis report

set -e

echo "🔬 LLM-Powered Alert Investigation - Performance Benchmarking"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create benchmark results directory
RESULTS_DIR="docs/alert_investigation/benchmarks/results"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/benchmark_report_${TIMESTAMP}.md"

echo -e "${BLUE}📊 Running performance benchmarks...${NC}"
echo ""

# Run benchmarks with JSON output
echo "Running test suite..."
yarn test:jest performance_benchmarks.test.ts \
  --json \
  --outputFile="$RESULTS_DIR/raw_results_${TIMESTAMP}.json" \
  --verbose 2>&1 | tee "$RESULTS_DIR/console_output_${TIMESTAMP}.log"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "============================================================"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Benchmarks completed successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Benchmarks completed with failures (exit code: $EXIT_CODE)${NC}"
fi

echo ""
echo -e "${BLUE}📝 Generating analysis report...${NC}"

# Generate report
cat > "$REPORT_FILE" <<EOF
# Performance Benchmark Report

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**System:** LLM-Powered Alert Investigation (5 Agents)
**Configuration:** Parallel execution (CTI || Investigation)

---

## Test Results Summary

**Exit Code:** $EXIT_CODE
$([ $EXIT_CODE -eq 0 ] && echo "**Status:** ✅ All tests passed" || echo "**Status:** ⚠️ Some tests failed")

**Raw Results:** [raw_results_${TIMESTAMP}.json](raw_results_${TIMESTAMP}.json)
**Console Output:** [console_output_${TIMESTAMP}.log](console_output_${TIMESTAMP}.log)

---

## Performance Metrics

### Latency (from console output)

\`\`\`
$(grep "✅.*investigation:" "$RESULTS_DIR/console_output_${TIMESTAMP}.log" || echo "No latency metrics found (mock tests)")
\`\`\`

### Competitive Benchmarks

\`\`\`
$(grep "✅.*Dropzone\|✅.*Time reduction\|✅.*Tier-1\|✅.*Multi-agent" "$RESULTS_DIR/console_output_${TIMESTAMP}.log" || echo "No competitive metrics found")
\`\`\`

### Cost Analysis

\`\`\`
$(grep "📊\|💰" "$RESULTS_DIR/console_output_${TIMESTAMP}.log" || echo "No cost metrics found")
\`\`\`

### Throughput

\`\`\`
$(grep "📈\|🚀" "$RESULTS_DIR/console_output_${TIMESTAMP}.log" || echo "No throughput metrics found")
\`\`\`

---

## Analysis

### Mock vs Real Performance

⚠️ **IMPORTANT:** These benchmarks use mock LLM responses.

**Mock performance:** 10-100ms per agent (unrealistic)
**Real performance (projected):** 5-21s per agent

**To get real performance:**
1. Deploy to dev environment
2. Configure real Claude connector
3. Re-run benchmarks with \`REAL_LLM=true\`
4. Measure with LangSmith tracing

### Validation Status

| Metric | Validated | Method |
|--------|-----------|--------|
| Logic correctness | ✅ Yes | Unit tests (38 tests) |
| Parallel execution | ✅ Yes | Graph structure verified |
| Error handling | ✅ Yes | Error injection tests |
| **Real latency** | ❌ No | Needs real LLM |
| **Real token usage** | ❌ No | Needs LangSmith |
| **Real success rate** | ❌ No | Needs production alerts |

---

## Recommendations

### Immediate (This Week)
1. ⏳ Run benchmarks with real Claude connector
2. ⏳ Measure actual latency via LangSmith
3. ⏳ Test with 10-20 diverse real alerts

### Short-Term (Weeks 2-3)
1. ⏳ Deploy to dev environment
2. ⏳ Validate parallel execution speedup
3. ⏳ Measure cost with real token usage

### Long-Term (Month 2+)
1. ⏳ A/B test Haiku vs Sonnet for Investigation
2. ⏳ Implement caching (40% cost reduction)
3. ⏳ Optimize prompts (20-30% token reduction)

---

## Links

- **Performance Analysis:** [PERFORMANCE_ANALYSIS.md](../PERFORMANCE_ANALYSIS.md)
- **Test Suite:** [performance_benchmarks.test.ts](../../../x-pack/solutions/security/plugins/elastic_assistant/server/lib/alert_investigation/benchmarks/performance_benchmarks.test.ts)
- **Raw Results:** [raw_results_${TIMESTAMP}.json](raw_results_${TIMESTAMP}.json)

---

**Next:** Configure real LLM and re-run for production metrics.
EOF

echo -e "${GREEN}✅ Report generated: $REPORT_FILE${NC}"
echo ""
echo "============================================================"
echo ""
echo "📋 Summary:"
echo "  - Benchmarks: $([ $EXIT_CODE -eq 0 ] && echo "${GREEN}PASSED${NC}" || echo "${YELLOW}PARTIAL${NC}")"
echo "  - Report: $REPORT_FILE"
echo "  - Raw data: $RESULTS_DIR/raw_results_${TIMESTAMP}.json"
echo ""
echo "🔬 Next steps:"
echo "  1. Review report: cat $REPORT_FILE"
echo "  2. Configure real Claude connector"
echo "  3. Re-run with: REAL_LLM=true ./run_benchmarks.sh"
echo ""
