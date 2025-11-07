# Example Prompts for Synthtrace MCP Tool

These prompts demonstrate complex scenarios that would be difficult to write programmatically but are easy to describe in natural language.

## 🎯 Example 1: Incident Simulation (Most Complex)

```
I need to simulate a production incident for a microservices architecture. Please generate:

**Services:**
- "frontend-service" (nodejs agent, 3 instances)
- "api-gateway" (java agent, 2 instances)  
- "payment-service" (go agent, 2 instances)
- "inventory-service" (python agent, 2 instances)
- "database-service" (dotnet agent, 1 instance)

**Timeline Behavior (1 hour window):**
- Start: Normal operations - 50 transactions/min per service, all successful
- At 70% of timeline: CPU metrics spike to 95% on payment-service and inventory-service
- At 70%: Error logs start appearing with message "Connection timeout" 
- At 70%: Transactions begin failing with 500 errors (20% error rate)
- At 75%: CPU spikes peak, then start declining
- At 75%: Error logs continue but with "Retrying connection"
- At 80%: CPU returns to normal (60%)
- At 80%: Error logs stop, transactions recover (back to 0% error rate)
- At 85%: All metrics and logs back to baseline

**Requirements:**
- All transactions, logs, and metrics must be correlated by transaction.id
- Spans within failed transactions should show which downstream service failed
- Metrics should reflect the CPU spike pattern (spike at 70%, peak at 75%, recovery at 80%)
- Logs should correlate with transaction failures (same transaction.id)
- Each service should have multiple instances showing different behaviors

Please:
1. Use the synthtrace tool with action "get_schema" to understand the expected JSON format
2. Use the synthtrace tool with action "get_examples" to see example configurations
3. **Create a JSON configuration object** that matches my requirements above (you create this JSON object based on the schema and examples)
4. Use the synthtrace tool with action "validate" to validate your generated configuration
5. Use the synthtrace tool with action "estimate" to see how many events will be created
6. Use the synthtrace tool with action "apply" to execute the configuration directly - it will generate and index data to Elasticsearch
7. Use the synthtrace tool with action "report" to generate a tabular summary of the configuration

**CRITICAL INSTRUCTIONS - READ CAREFULLY:** 
- **DO NOT create any files** (.json, .js, .ts, or any other file type)
- **DO NOT modify or write any code**
- **DO NOT use file system operations** (writeFile, createFile, fs.writeFileSync, etc.)
- **Pass configuration objects directly** in the tool's `payload.config` parameter
- The `apply` action executes immediately and indexes data to Elasticsearch (default: http://localhost:9200)
- The flow is: `get_schema` → `get_examples` → **(you create JSON object in memory)** → `validate` → `estimate` → `apply` (executes directly, no file needed)
- All configuration must be passed as JSON objects in tool calls - never create files
- **Time-varying error rates**: You can use piecewise distributions for `errorRate` to simulate incidents:
  ```json
  "errorRate": {
    "type": "piecewise",
    "segments": [
      { "to": "70%", "value": 0 },
      { "from": "70%", "to": "80%", "value": 0.2 },
      { "from": "80%", "value": 0 }
    ]
  }
  ```
```

## 🎯 Example 2: Gradual Degradation Pattern

```
Create a scenario showing gradual service degradation and recovery:

**Service:** "recommendation-engine" (python agent, 2 instances)

**Time Range:** Last 2 hours

**Behavior:**
- First 30 minutes: Normal operation - 100 transactions/min, avg latency 50ms
- Minutes 30-60: Gradual degradation - latency increases linearly from 50ms to 500ms
- Minutes 60-90: Severe degradation - latency stays at 500ms, error rate increases from 0% to 15%
- Minutes 90-120: Recovery - latency decreases linearly back to 50ms, error rate drops to 0%

**Metrics:**
- CPU should correlate with latency (higher latency = higher CPU)
- Memory should show gradual increase during degradation, then decrease during recovery
- Generate metrics every 30 seconds

**Traces:**
- Each transaction should have 2-3 spans showing internal processing
- Span durations should reflect the latency pattern
- Failed transactions (during error period) should have error spans

**Correlation:**
- All events must share transaction.id
- Metrics should align with transaction timing
- Spans should show which operation failed during errors

Create a JSON configuration object matching these requirements, then validate it using the synthtrace tool.
```

## 🎯 Example 3: Cascading Failure Across Services

```
I need to simulate a cascading failure scenario:

**Architecture:**
- "web-app" (nodejs) → calls → "auth-service" (java) → calls → "user-db" (postgres)
- "web-app" (nodejs) → calls → "product-service" (go) → calls → "product-db" (postgres)

**Scenario:**
- Time range: Last 45 minutes
- Minute 0-15: Normal operations, all services healthy
- Minute 15: user-db starts having issues (50% of queries fail)
- Minute 20: auth-service starts failing because user-db is down (cascading)
- Minute 20: product-service still healthy (isolated)
- Minute 25: Both auth-service and product-service start failing
- Minute 30: user-db recovers
- Minute 35: auth-service recovers
- Minute 40: All services back to normal

**Requirements:**
- Generate traces showing the call chain (web-app → auth-service → user-db)
- Failed transactions should propagate errors up the chain
- Each service should have distinct error patterns
- Metrics should show CPU/memory spikes during failures
- Logs should show error messages correlating with failed transactions
- All events linked by trace.id and transaction.id

**Additional:**
- Generate 30 transactions/min per service
- Each transaction should have 2-4 spans showing the service chain
- Failed spans should have error markers
- Metrics should update every 30 seconds

Please create a JSON configuration object, then validate and estimate it using the synthtrace tool.
```

## 🎯 Example 4: Traffic Spike with Auto-Scaling Simulation

```
Simulate a traffic spike scenario where a service auto-scales:

**Service:** "image-processing-service" (python agent)

**Baseline:** 3 instances, 20 transactions/min each

**Traffic Pattern (2 hour window):**
- Hours 0-0.5: Normal traffic (20 tx/min per instance)
- Hours 0.5-1.0: Traffic spike begins, ramps up linearly to 100 tx/min per instance
- Hours 1.0-1.5: Peak traffic (100 tx/min per instance), 5 instances active (auto-scaled)
- Hours 1.5-2.0: Traffic decreases linearly back to baseline, instances scale down to 3

**Behavior:**
- Latency should increase during spike (more instances = more load)
- CPU should spike when new instances come online
- Metrics should show instance count changes
- Transactions should be distributed across all active instances
- During peak: Some transactions should have higher latency (resource contention)

**Metrics:**
- Track CPU, memory, and request rate per instance
- Show instance count over time
- Correlate metrics with transaction timing

**Traces:**
- Each transaction should have processing spans
- Latency should reflect the traffic pattern
- Some transactions during peak should show "queued" spans

Create the full JSON configuration object and validate it.
```

## 🎯 Example 5: Multi-Signal Correlation Challenge

```
Create a complex multi-signal scenario showing correlated observability data:

**Service:** "order-fulfillment" (java agent, 2 instances)

**Requirements:**
- Generate traces, logs, AND metrics that are all correlated
- Time range: Last 90 minutes

**Behavior:**
- First 30 min: Normal - 40 orders/min, all successful
- Minutes 30-45: Orders spike to 80/min, causing CPU to hit 90%
- Minutes 45-60: CPU stays high, logs show "High queue depth" warnings
- Minutes 60-75: CPU drops, but logs show "Memory pressure" errors
- Minutes 75-90: Everything recovers to baseline

**Correlation Requirements:**
- Each transaction must have a unique transaction.id
- Logs must reference the same transaction.id as traces
- Metrics must align with transaction timing
- CPU spikes should correlate with transaction volume
- Error logs should match failed transactions (same transaction.id)
- Memory metrics should align with log warnings

**Trace Structure:**
- Each order transaction should have:
  1. "Receive Order" span
  2. "Validate Payment" span  
  3. "Process Inventory" span
  4. "Send Confirmation" span

**Logs:**
- Info logs for successful orders
- Warning logs during high load (correlate with transaction.id)
- Error logs for failed orders (correlate with transaction.id)

**Metrics:**
- CPU percentage (should spike with traffic)
- Memory usage (should increase during issues)
- Queue depth (derived metric)

All signals must be perfectly correlated. Generate and validate.
```

## 🎯 Example 6: Synthetic Monitor Failure Impact

```
Simulate a scenario where a synthetic monitor detects an issue:

**Services:**
- "api-service" (nodejs, 2 instances)
- "cache-service" (redis, 1 instance)

**Synthetic Monitor:**
- HTTP check every 5 minutes on "api-service" health endpoint
- Browser check every 10 minutes on main page

**Timeline (3 hours):**
- Hours 0-1: All services healthy, monitors passing
- Hour 1: cache-service fails, starts returning errors
- Hour 1.5: api-service starts failing because cache is down
- Hour 1.5: Synthetic monitors start failing (HTTP checks return 500)
- Hour 2: cache-service recovers
- Hour 2.5: api-service recovers
- Hour 2.5: Synthetic monitors start passing again

**Requirements:**
- Generate traces for api-service (showing cache calls)
- Generate metrics for both services (CPU, memory, error rates)
- Generate synthetic monitor checks (HTTP and browser)
- All events must correlate:
  - Monitor failures should align with service failures
  - Traces should show cache errors
  - Metrics should show error spikes
  - Timeline should be consistent across all signals

**Transaction Pattern:**
- 50 transactions/min normally
- Error rate increases during failure period
- Cache-related spans should show errors during cache outage

Create the complete JSON configuration object.
```

## 💡 Why These Are Difficult to Code

Each of these scenarios would require:

1. **Complex Timing Logic**: Piecewise functions, time-based conditions
2. **Cross-Signal Correlation**: Ensuring transaction.id, trace.id match across traces, logs, metrics
3. **State Management**: Tracking service states over time
4. **Conditional Behavior**: Different behaviors at different time points
5. **Cascading Effects**: One service failure affecting others
6. **Dynamic Scaling**: Instance count changes over time

With the synthtrace MCP tool, you can describe these scenarios naturally and let the LLM generate the configuration automatically!

## 🚀 How to Use These Prompts

1. **Start MCP Server**: `node scripts/mcp_dev.js`
2. **Connect Your AI IDE** to the MCP server
3. **Copy one of the prompts above** and paste it into your IDE
4. **The LLM will**:
   - Call `get_schema` to understand the format
   - Call `get_examples` for reference
   - Create the JSON configuration object
   - Validate it
   - Estimate event counts
   - Provide instructions for applying

## 📝 Tips for Creating Your Own Prompts

1. **Be Specific About Timing**: Use percentages (70% of timeline) or absolute times
2. **Describe Correlations**: Explicitly state which IDs should match (transaction.id, trace.id)
3. **Mention Multiple Signals**: Ask for traces, logs, AND metrics together
4. **Describe Patterns**: Use words like "spike", "gradual", "linear", "recovery"
5. **Specify Service Relationships**: "Service A calls Service B which calls Service C"
6. **Include Error Scenarios**: Describe when and why errors occur

The more detailed your prompt, the better the LLM can create the configuration!

