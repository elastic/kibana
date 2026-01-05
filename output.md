# Research: Naming for Step Output Validation in Workflows

## Your Original Concept

```yaml
- name: httpStep
  type: http
  assertCondition: ${{ output | contains("foo") }}
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

**Purpose:** Validate step output and trigger retry/failure if condition is not met.

**Use Case:** Polling - retry until expected data appears in response.

---

## Analysis

✅ **Your concept makes complete sense!** It addresses a real pattern in workflow automation: conditional success/failure based on output validation.

### The Problem It Solves

When you trigger an endpoint that returns 200 OK, the step succeeds even if the response content isn't what you need. With output validation, you can:

1. Poll an endpoint repeatedly until specific data appears
2. Validate response structure/content before proceeding
3. Implement conditional success logic declaratively
4. Avoid writing separate "if" condition steps for error handling

---

## Industry Research

### 1. **Temporal** (Workflow Engine)

**Approach:** Activity Retry Policy with custom error handling

**Pattern:**
```typescript
// Throw ApplicationFailure with nonRetryable flag
if (chargeAmount < 0) {
  throw ApplicationFailure.create({
    message: `Invalid charge amount: ${chargeAmount}`,
    nonRetryable: true  // Don't retry this error
  });
}

// Or let retry policy handle it
const { myActivity } = proxyActivities<typeof activities>({
  scheduleToCloseTimeout: '5m',
  retry: {
    initialInterval: '10s',
    maximumAttempts: 5
  }
});
```

**Key Concepts:**
- Throws errors to trigger retries
- `ApplicationFailure` with `nonRetryable` flag for validation errors
- Retry policies configured per activity
- No built-in "assert" or "validate" keyword

**Documentation Links:**
- Retry Policies: https://docs.temporal.io/encyclopedia/retry-policies
- Activity Timeouts: https://docs.temporal.io/encyclopedia/detecting-activity-failures
- Failure Handling: https://docs.temporal.io/develop/typescript/failure-detection

---

### 2. **n8n** (Workflow Automation)

**Approach:** Filter nodes and conditional routing

**Pattern:**
```
HTTP Request → Filter Node (check output) → Branch based on condition
                    ↓
              Error Workflow (if filter fails)
```

**Key Concepts:**
- **"Continue On Fail"** option on nodes
- **"Filter"** and **"If"** nodes for conditional logic
- **"Error Workflow"** for handling failures
- No built-in output validation on steps

**Pattern for Polling:**
```
Schedule Trigger → HTTP Request → If Node (check response)
                                      ↓
                                 (false) → Wait → Loop back
                                      ↓
                                 (true) → Continue workflow
```

**Documentation:**
- Error Handling: https://docs.n8n.io/flow-logic/error-handling/
- Filter Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.filter/

---

### 3. **Tines** (Security Automation)

**Approach:** Rule matching on action outputs

**Pattern:**
```yaml
actions:
  - name: check_api
    type: http_request
    exit_on_error: true
    retry_on_failure: true
    # Rules define success/failure conditions
```

**Key Concepts:**
- **"Rule matching"** on outputs
- **"Exit on error"** option
- **"Retry on failure"** option
- Actions can have success/failure rules

**Documentation:**
- Actions: https://www.tines.com/docs/actions/

---

## Naming Analysis

### ❌ Why "assertCondition" Is Confusing

1. **"Assert"** is testing/debugging terminology
   - Used in unit tests: `assert(condition, "error message")`
   - Implies development/testing context, not production workflow
   - Developers expect asserts to be removable in production

2. **Not used in major workflow tools**
   - Temporal: "Retry Policy"
   - n8n: "Continue On Fail", "Filter"
   - Tines: "Rule", "Exit on error"

3. **Ambiguous intent**
   - Does it validate? Check? Test? Guard?
   - What happens when it fails?

---

## Recommended Naming Options

### ⭐⭐⭐ **BEST: `successCondition`**

**Why it's best:**
- ✅ Clear intent: "When is this step successful?"
- ✅ Positive framing (success vs failure)
- ✅ Aligns with `on-failure` naming
- ✅ Self-documenting behavior
- ✅ Intuitive: returns true → success, false → failure → retry

**Example:**
```yaml
- name: poll_api
  type: http
  successCondition: ${{ output.status == "complete" }}
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

**Read aloud:** "This step succeeds when output.status equals 'complete'"

---

### ⭐⭐ **Good Alternatives:**

#### 1. `outputValidator` or `validateOutput`

**Pros:**
- Common in software testing
- Clear that it validates output
- Familiar to developers

**Cons:**
- "Validate" implies checking format, not determining success
- Less intuitive than "success condition"

**Example:**
```yaml
- name: poll_api
  type: http
  outputValidator: ${{ output.status == "complete" }}
```

---

#### 2. `retryUnless` / `retryWhen`

**Pros:**
- Directly states the behavior
- Makes retry logic explicit
- Good for polling use cases

**Cons:**
- Tied to retry behavior (what if no retry?)
- Less clear for non-retry scenarios

**Example:**
```yaml
- name: poll_api
  type: http
  retryUnless: ${{ output.status == "complete" }}
  on-failure:
    retry:
      max-attempts: 10
```

---

#### 3. `continueIf` / `continueWhen`

**Pros:**
- Focuses on workflow control flow
- Clear about next step behavior

**Cons:**
- "Continue" is vague (continue to where?)
- Doesn't clarify what happens when false

**Example:**
```yaml
- name: poll_api
  type: http
  continueIf: ${{ output.status == "complete" }}
```

---

### ⭐ Other Options:

#### 4. `expectation`

**Pros:**
- Testing terminology (BDD: expect/should)
- Academic soundness

**Cons:**
- Less common in workflow tools
- More abstract than "success condition"

---

### ❌ **Avoid:**

- ❌ `assertCondition` - Testing terminology, confusing intent
- ❌ `validationRule` - Too generic, unclear behavior
- ❌ `postCondition` - Too academic/formal
- ❌ `checkCondition` - What does "check" mean?
- ❌ `guard` - Not clear what it guards

---

## Implementation Recommendations

### Basic Implementation

```yaml
- name: httpStep
  type: http
  url: https://api.example.com/status
  successCondition: ${{ output.status == "ready" }}
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

**Behavior:**
1. Execute HTTP request
2. Evaluate `successCondition` on output
3. If `true`: Step succeeds, workflow continues
4. If `false`: Throw `ValidationError`, trigger `on-failure` handler
5. Retry logic applies → Poll again after delay

---

### Advanced: Multiple Conditions

Consider supporting explicit success/failure conditions:

```yaml
- name: httpStep
  type: http
  successCondition: ${{ output.status == "complete" }}
  failureCondition: ${{ output.status == "error" }}
  # If neither matches, step remains pending/running
  
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

---

### Advanced: Custom Error Types

```yaml
- name: httpStep
  type: http
  successCondition: ${{ output.status == "ready" }}
  failureType: ValidationError  # Custom error type for metrics/filtering
  
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

---

## Documentation Template

### `successCondition`

Defines when a step's output is considered successful. If the condition evaluates to `false`, the step throws a `ValidationError` and triggers the `on-failure` handlers.

**Type:** Expression that evaluates to boolean

**When evaluated:** After step completes, before marking as successful

**Behavior:**
- Returns `true`: Step succeeds, workflow continues
- Returns `false`: Step fails with `ValidationError`, triggers retry/error handlers
- Expression error: Step fails immediately (no retry)

**Use cases:**
- **Polling:** Retry until expected data appears
- **Validation:** Ensure response has required fields/values
- **Conditional success:** Different success criteria based on context

**Example: Polling API**
```yaml
- name: check_deployment_status
  type: http
  url: https://api.example.com/deployments/{{deploymentId}}
  successCondition: ${{ output.status == "deployed" }}
  on-failure:
    retry:
      max-attempts: 20  # Poll up to 20 times
      delay: 5s         # Wait 5 seconds between polls
```

**Example: Validate Response Structure**
```yaml
- name: fetch_user_data
  type: http
  url: https://api.example.com/users/{{userId}}
  successCondition: ${{ output.email != null && output.name != null }}
  on-failure:
    notify:
      - channel: alerts
        message: "Invalid user data received"
```

**Example: Complex Validation**
```yaml
- name: check_health
  type: http
  url: https://api.example.com/health
  successCondition: |
    ${{
      output.status == "healthy" &&
      output.services | all(s -> s.status == "up") &&
      output.latency < 1000
    }}
```

**Notes:**
- The condition is evaluated using the workflow expression language
- Has access to `output`, `input`, and other step context
- Should be a pure expression (no side effects)
- Errors in the expression itself cause immediate failure

---

## Comparison with Other Tools

| Tool | Concept | Syntax | Behavior |
|------|---------|--------|----------|
| **Your Design** | `successCondition` | `successCondition: ${{ expr }}` | Explicit success validation, triggers retry |
| **Temporal** | Retry Policy + Errors | Throw `ApplicationFailure` | Implicit - must throw errors manually |
| **n8n** | Filter Node | Separate Filter/If nodes | Explicit routing through nodes |
| **Tines** | Rule Matching | Action rules | Implicit - built into actions |

**Your approach advantages:**
- ✅ More declarative than Temporal (no manual error throwing)
- ✅ More concise than n8n (no separate nodes needed)
- ✅ More explicit than Tines (clear condition syntax)
- ✅ Better for polling use cases (built-in retry integration)

---

## Final Recommendation

### Use `successCondition`

**Reasoning:**
1. ✅ Most intuitive name for the concept
2. ✅ Self-documenting: "When does this step succeed?"
3. ✅ Positive framing reduces cognitive load
4. ✅ Aligns with existing `on-failure` naming
5. ✅ Clear behavior: true = success, false = retry
6. ✅ Not tied to testing terminology
7. ✅ Works for all use cases (polling, validation, conditional logic)

**Alternative if you want to emphasize validation:** `outputValidator`

**Alternative if you want to emphasize flow control:** `continueIf`

But `successCondition` strikes the best balance of clarity, intent, and usability.

---

## Related Concepts to Consider

### 1. Timeout for Polling

```yaml
- name: poll_api
  type: http
  successCondition: ${{ output.status == "ready" }}
  timeout: 5m  # Overall timeout for polling
  on-failure:
    retry:
      max-attempts: 60
      delay: 5s
```

### 2. Success vs Failure Conditions

```yaml
- name: check_status
  type: http
  successCondition: ${{ output.status == "success" }}
  failureCondition: ${{ output.status == "error" }}  
  # If neither: keep polling (status == "pending")
```

### 3. Custom Error Messages

```yaml
- name: validate_response
  type: http
  successCondition: ${{ output | contains("foo") }}
  failureMessage: "Response does not contain required data: 'foo'"
```

### 4. Conditional Retry Delays

```yaml
- name: poll_api
  type: http
  successCondition: ${{ output.ready }}
  on-failure:
    retry:
      max-attempts: 10
      delay: ${{ output.retry_after ?? 2s }}  # Use API's retry hint
```

---

## Links to Industry Documentation

### Temporal
- Retry Policies: https://docs.temporal.io/encyclopedia/retry-policies
- Activity Failure Detection: https://docs.temporal.io/encyclopedia/detecting-activity-failures
- TypeScript Failure Handling: https://docs.temporal.io/develop/typescript/failure-detection

### n8n
- Error Handling: https://docs.n8n.io/flow-logic/error-handling/
- Flow Logic: https://docs.n8n.io/flow-logic/
- Filter Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.filter/

### Tines
- Actions Documentation: https://www.tines.com/docs/actions/
- Formulas: https://www.tines.com/docs/formulas/

---

## Summary

**Question:** Is `assertCondition` confusing?  
**Answer:** Yes, use `successCondition` instead.

**Recommended Implementation:**
```yaml
- name: httpStep
  type: http
  successCondition: ${{ output | contains("foo") }}
  on-failure:
    retry:
      max-attempts: 10
      delay: 2s
```

**Why `successCondition`:**
- Clear, intuitive, self-documenting
- Positive framing (success vs assertion)
- Not tied to testing terminology
- Aligns with workflow automation patterns
- Works perfectly for polling use cases

**Industry precedent:**
- No major tool uses "assert" for this pattern
- Tools use: retry policies, filters, rules, conditions
- Your approach is actually clearer than existing solutions

---

*Generated: 2025-11-25*
