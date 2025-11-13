# On-Failure Configuration

The `on-failure` configuration provides error handling for workflow steps. It can be configured at the step level or workflow level (in `settings`).


## Configuration Levels

### Step Level

```yaml
steps:
  - name: api-call
    type: http
    on-failure:
      retry:
        max-attempts: 3
        delay: "5s"
```

### Workflow Level

```yaml
settings:
  on-failure:
    retry:
      max-attempts: 2
      delay: "1s"
steps:
  - name: api-call
    type: http
```

**Note:** Step-level `on-failure` takes precedence over workflow-level configuration.

## Options

### Retry

Retries the step on failure with configurable attempts and delay.

```yaml
on-failure:
  retry:
    max-attempts: 3  # Required: minimum 1
    delay: "5s"      # Optional: duration format (e.g., "5s", "1m", "2h")
```

**Behavior:**
- Retries up to `max-attempts` times
- Waits `delay` between retries (if specified)
- Workflow enters `WAITING` state if delay exceeds task manager threshold
- Workflow fails if all retries are exhausted

### Fallback

Executes alternative steps when the primary step fails.

```yaml
on-failure:
  fallback:
    - name: fallback-step
      type: http
      with:
        url: "https://backup-api.example.com"
```

**Behavior:**
- Executes fallback steps only after retries are exhausted (if retry is configured)
- Original error is preserved in workflow execution
- **By default, workflow still fails after fallback execution** (error is re-thrown)
- To continue execution after fallback, use `continue: true` (see below)

### Continue

Continues workflow execution despite step failure.

```yaml
on-failure:
  continue: true
```

**Behavior:**
- Workflow continues to next step even if current step fails
- Failed step error is recorded but doesn't stop workflow
- Workflow completes successfully

## Processing Order

Options are processed in order: **retry → fallback → continue**

1. **Retry** (if configured): Wraps step with retry logic
2. **Fallback** (if configured): Wraps with fallback path
3. **Continue** (if configured): Wraps with continue logic

## Combining Options

```yaml
on-failure:
  retry:
    max-attempts: 2
    delay: "1s"
  fallback:
    - name: backup-step
      type: http
  continue: true
```

**Flow:** Retry → Fallback → Continue

**Note:** Without `continue: true`, the workflow will fail after executing fallback steps. The fallback executes, but the original error is re-thrown, causing the workflow to fail.

## Restrictions

- Flow control steps (`if`, `foreach`) cannot have workflow-level `on-failure`
- Step-level `on-failure` is removed during graph construction to avoid infinite recursion
- Fallback steps execute only after retries are exhausted
