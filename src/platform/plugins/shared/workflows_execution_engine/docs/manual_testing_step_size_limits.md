# Manual Testing: Step Size Limits

This guide walks through testing each enforcement mechanism for step size limits.
Each section describes the workflow to create, what to expect, and how to verify the result.

## Prerequisites

1. Kibana running locally with the step size limits code (`feature/poc-size-limits` branch)
2. `kibana.dev.yml` includes:
   ```yaml
   workflowsExecutionEngine.maxResponseSize: 10mb
   ```
3. Seed the test Elasticsearch index (for ES step tests):
   ```bash
   bash workflows/examples/seed_large_index.sh
   ```
4. Workflows UI enabled (`uiSettings.overrides: workflows:ui:enabled: true`)

---

## Test 1: HTTP Step -- Mid-Stream Abort (Layer 1)

**What it tests:** axios `maxContentLength` aborts the download before the full response enters memory.

**Create workflow:**
```yaml
name: Test HTTP Size Limit
triggers:
  - type: manual
settings:
  max-step-size: 5mb
steps:
  - name: download_large_file
    type: http
    with:
      url: https://raw.githubusercontent.com/json-iterator/test-data/master/large-file.json
      method: GET
      headers:
        Accept: application/json
```

**Expected result:**
- Step `download_large_file` fails
- Error type: `StepSizeLimitExceeded`
- Error message contains: `exceeded the size limit` and `5 MB`
- Step duration should be short (aborted mid-stream, not after full download)
- No OOM, Kibana stays healthy

**Verification:**
- In the Executions tab, click on the failed step
- Error tab shows `StepSizeLimitExceeded`
- `error.details.limitBytes` = 5242880

---

## Test 2: Elasticsearch Step -- Mid-Stream Abort (Layer 1)

**What it tests:** `transport.request({ maxResponseSize })` aborts the ES response before the full result enters memory.

**Create workflow:**
```yaml
name: Test ES Size Limit
triggers:
  - type: manual
settings:
  max-step-size: 5mb
steps:
  - name: search_all_docs
    type: elasticsearch.search
    with:
      index: large-test-data
      query:
        match_all: {}
      size: 10000
```

**Expected result:**
- Step `search_all_docs` fails
- Error type: `StepSizeLimitExceeded`
- Error message contains: `exceeded the size limit`
- The ES transport aborted mid-stream (you may see `RequestAbortedError` in debug logs)

**Verification:**
- Executions tab > click failed step > Error tab
- Kibana console: `GET large-test-data/_count` should show 10,000 docs
- The step failed because the response (~10MB) exceeds the 5mb limit

---

## Test 3: Kibana Action Step -- Streaming Reader Abort (Layer 1)

**What it tests:** The streaming body reader in `KibanaActionStepImpl` aborts `fetch` mid-stream.

**Note:** If `server.publicBaseUrl` points to an unreachable URL (e.g., ngrok), comment it out first.

**Create workflow:**
```yaml
name: Test Kibana Action Size Limit
triggers:
  - type: manual
steps:
  - name: fetch_kibana_data
    type: kibana.request
    max-step-size: 100b
    with:
      request:
        method: POST
        path: /api/workflows/search
        body: {}
```

**Expected result:**
- Step `fetch_kibana_data` fails
- Error type: `StepSizeLimitExceeded`
- Even the smallest API response exceeds 100 bytes
- The streaming reader aborted mid-read

**Verification:**
- The step fails immediately (not after buffering the full response)
- Error details show the limit was 100 bytes

---

## Test 4: Base Class Output Guard (Layer 2) -- Works for ANY Step

**What it tests:** The base class output check in `BaseAtomicNodeImplementation.run()` catches oversized output from any step type, including `data.set` and connectors.

**Create workflow (no connectors needed):**
```yaml
name: Test Layer 2 Output Guard
triggers:
  - type: manual
steps:
  - name: generate_data
    type: data.set
    max-step-size: 10b
    with:
      some_key: "This string is definitely longer than 10 bytes"
```

**Expected result:**
- Step fails with `StepSizeLimitExceeded`
- Even a simple `data.set` output exceeds 10 bytes
- This proves Layer 2 catches outputs from ANY step type, no special handling needed

**Alternative -- with a real connector:**
If you have a Slack or other connector configured, use it with `max-step-size: 10b` to verify connector outputs are also caught.

---

## Test 5: Config Precedence -- Step > Workflow > Plugin

**What it tests:** Step-level `max-step-size` overrides workflow-level, which overrides `kibana.yml`.

**Setup:** Set `workflowsExecutionEngine.maxResponseSize: 1kb` in `kibana.dev.yml` and restart.

**Create workflow:**
```yaml
name: Test Config Precedence
triggers:
  - type: manual
settings:
  max-step-size: 100kb
steps:
  # This step uses workflow-level limit (100kb) -- should succeed
  - name: step_uses_workflow_limit
    type: elasticsearch.search
    with:
      index: large-test-data
      body:
        query:
          match_all: {}
        size: 5

  # This step overrides to 10b -- should fail even though workflow allows 100kb
  - name: step_overrides_to_tiny
    type: elasticsearch.search
    max-step-size: 10b
    with:
      index: large-test-data
      body:
        query:
          match_all: {}
        size: 1
```

**Expected result:**
- `step_uses_workflow_limit` succeeds (5 docs < 100kb)
- `step_overrides_to_tiny` fails with `StepSizeLimitExceeded` (even 1 doc > 10 bytes)

---

## Test 6: on-failure: continue -- Graceful Degradation

**What it tests:** The workflow continues past a failed step when `on-failure: continue` is set.

**Create workflow:**
```yaml
name: Test On-Failure Continue
triggers:
  - type: manual
settings:
  max-step-size: 1kb
steps:
  - name: will_fail
    type: http
    on-failure:
      continue: true
    with:
      url: https://raw.githubusercontent.com/json-iterator/test-data/master/large-file.json
      method: GET

  - name: runs_after_failure
    type: data.set
    with:
      status: 'Previous step failed but workflow continued'
```

**Expected result:**
- `will_fail` fails with `StepSizeLimitExceeded`
- `runs_after_failure` completes successfully
- Workflow status: COMPLETED (not FAILED)

---

## Test 7: Input Size Check

**What it tests:** Oversized template-rendered inputs are rejected before the step executes.

**Create workflow:**
```yaml
name: Test Input Size Check
triggers:
  - type: manual
steps:
  - name: gen_data
    type: data.set
    with:
      big_value: "This is a large string that will be referenced by the next step"
  - name: receive_big_input
    type: data.set
    max-step-size: 10b
    with:
      ref: "{{ steps.gen_data.output | json }}"
```

**Expected result:**
- `gen_data` succeeds
- `receive_big_input` fails with `StepSizeLimitExceeded` and message contains "input"
- The step never executes `_run()` -- it fails during input validation

---

## Test 8: Invalid max-step-size Value

**What it tests:** An invalid `max-step-size` value produces a clear error.

**Create workflow:**
```yaml
name: Test Invalid Limit
triggers:
  - type: manual
steps:
  - name: bad_limit
    type: data.set
    max-step-size: banana
    with:
      key: value
```

**Expected result:**
- Step fails with an error about invalid byte size format
- No crash, Kibana stays healthy

---

## Quick Validation Checklist

| # | Mechanism | Step Type | Expected Error | Verified? |
|---|---|---|---|---|
| 1 | Layer 1: axios mid-stream | HTTP (`type: http`) | `StepSizeLimitExceeded` | [ ] |
| 2 | Layer 1: ES transport mid-stream | ES (`type: elasticsearch.*`) | `StepSizeLimitExceeded` | [ ] |
| 3 | Layer 1: fetch streaming reader | Kibana (`type: kibana.*`) | `StepSizeLimitExceeded` | [ ] |
| 4 | Layer 2: base class output guard | `data.set` or any step | `StepSizeLimitExceeded` | [ ] |
| 5 | Config: step > workflow > plugin | Mixed | Correct precedence | [ ] |
| 6 | on-failure: continue | Any | Workflow continues | [ ] |
| 7 | Input size check | Any with template refs | `StepSizeLimitExceeded` (input) | [ ] |
| 8 | Invalid max-step-size | Any | Parse error | [ ] |
