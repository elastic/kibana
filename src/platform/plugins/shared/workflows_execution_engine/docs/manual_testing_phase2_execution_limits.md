<!--
Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
or more contributor license agreements. Licensed under the "Elastic License
2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
Public License v 1"; you may not use this file except in compliance with, at
your election, the "Elastic License 2.0", the "GNU Affero General Public
License v3.0 only", or the "Server Side Public License, v 1".
-->

# Manual Testing: Phase 2 Execution Limits

This guide covers testing all five Phase 2 execution limit mechanisms. Each test includes the YAML workflow definition, expected behavior/error, and verification steps.

## Prerequisites

- Kibana running in dev mode (`yarn start`)
- Workflows UI enabled in `kibana.dev.yml`:

  ```yaml
  uiSettings.overrides:
    workflows:ui:enabled: true
  ```

- Feature flag for workflows enabled

---

## Test 1: LiquidJS OOM Prevention — For Loop String Explosion

**Description:** Verifies that a malicious LiquidJS template that would previously crash Kibana with OOM (500,000 iterations producing a huge string) is now rejected by the template size limit.

**YAML:**

```yaml
name: LiquidJS OOM Exploit
triggers:
  - type: manual
steps:
  - name: explode
    type: data.set
    with:
      payload: "{% for i in (1..500000) %}AAAAAAAA{% endfor %}"
```

**Expected Result:** Step fails with `TemplateSizeLimitExceeded` error. Previously this workflow crashed Kibana with OOM.

**How to Verify:**

1. Create the workflow in the Workflows UI.
2. Execute it manually.
3. In the Executions tab, open the failed execution.
4. Confirm the step `explode` failed with error type `TemplateSizeLimitExceeded`.
5. Kibana remains responsive (no OOM crash).

---

## Test 2: LiquidJS with Custom Step Size

**Description:** Verifies that a step-level `max-step-size` overrides the default and enforces a stricter limit (~1KB) on template output.

**YAML:**

```yaml
name: LiquidJS Custom Limit
triggers:
  - type: manual
steps:
  - name: small_render
    type: data.set
    max-step-size: '1kb'
    with:
      payload: "{% for i in (1..500) %}AAAAAAAAAA{% endfor %}"
```

**Expected Result:** Step fails with `TemplateSizeLimitExceeded` when output exceeds ~1KB.

**How to Verify:**

1. Create and execute the workflow.
2. Confirm step `small_render` fails with `TemplateSizeLimitExceeded`.
3. Error details should indicate the limit was 1KB (1024 bytes).

---

## Test 3: LiquidJS Within Limit

**Description:** Verifies that a small, valid LiquidJS template executes successfully when within the default size limit.

**YAML:**

```yaml
name: LiquidJS Within Limit
triggers:
  - type: manual
steps:
  - name: ok_render
    type: data.set
    with:
      payload: "{% for i in (1..10) %}Hello {{ i }} {% endfor %}"
```

**Expected Result:** Workflow completes successfully.

**How to Verify:**

1. Create and execute the workflow.
2. Confirm execution status is COMPLETED.
3. Step `ok_render` output contains the rendered string (e.g., "Hello 1 Hello 2 ... Hello 10 ").

---

## Test 4: Default Foreach Iteration Cap

**Description:** Verifies that a foreach loop without `max-iterations` stops at the default cap of 2000 iterations (with `on-limit: continue`).

**YAML:**

```yaml
name: Foreach Default Cap
triggers:
  - type: manual
steps:
  - name: generate_items
    type: data.set
    with:
      items: "${{ (1..5000) | join: ',' | split: ',' }}"
  - name: loop
    type: foreach
    foreach: "${{ variables.items }}"
    steps:
      - name: process
        type: data.set
        with:
          processed: "item {{ foreach.index }}"
```

**Expected Result:** Loop stops at 2000 iterations (default max). Workflow completes with first 2000 items processed.

**How to Verify:**

1. Create and execute the workflow.
2. Confirm execution completes (status COMPLETED).
3. Inspect the last iteration of step `process` — `foreach.index` should be 2000.
4. Only 2000 of 5000 items are processed.

---

## Test 5: Foreach With Explicit Max-Iterations

**Description:** Verifies that an explicit `max-iterations` on a foreach step overrides the default and limits iterations to the specified value.

**YAML:**

```yaml
name: Foreach Explicit Max
triggers:
  - type: manual
steps:
  - name: loop
    type: foreach
    foreach: "[1,2,3,4,5,6,7,8,9,10]"
    max-iterations: 3
    steps:
      - name: process
        type: data.set
        with:
          val: "{{ foreach.item }}"
```

**Expected Result:** Only 3 items are processed (1, 2, 3).

**How to Verify:**

1. Create and execute the workflow.
2. Confirm execution completes.
3. Verify only 3 iterations of step `process` ran (check execution history or step output).
4. The fourth item onward are not processed.

---

## Test 6: Cumulative Output Budget

**Description:** Verifies that the cumulative output across all steps is tracked and that `WorkflowOutputBudgetExceeded` is thrown when the total exceeds `max-total-output-size`.

**YAML:**

```yaml
name: Cumulative Budget Test
triggers:
  - type: manual
settings:
  max-total-output-size: '10kb'
steps:
  - name: step1
    type: data.set
    with:
      data: "{% for i in (1..100) %}AAAAAAAAAA{% endfor %}"
  - name: step2
    type: data.set
    with:
      data: "{% for i in (1..100) %}BBBBBBBBBB{% endfor %}"
  - name: step3
    type: data.set
    with:
      data: "{% for i in (1..100) %}CCCCCCCCCC{% endfor %}"
```

**Expected Result:** `WorkflowOutputBudgetExceeded` after step2 or step3 when cumulative output exceeds 10KB.

**How to Verify:**

1. Create and execute the workflow.
2. Confirm one of the steps fails with `WorkflowOutputBudgetExceeded`.
3. Error details should include the budget limit (10KB) and the step that exceeded it.
4. Each step produces ~1KB; three steps exceed 10KB total.

---

## Test 7: Step Count Validation

**Description:** Verifies that workflows with more than 150 steps (default max) cannot be saved and produce a validation error.

**YAML:** Create a workflow with more than 150 steps. For example, use a script or editor to generate:

```yaml
name: Too Many Steps
triggers:
  - type: manual
steps:
  - name: step1
    type: data.set
    with:
      x: "1"
  - name: step2
    type: data.set
    with:
      x: "2"
  # ... repeat until you have 151+ steps
  - name: step151
    type: data.set
    with:
      x: "151"
```

**Expected Result:** Validation error when saving: "Workflow exceeds the maximum of 150 steps".

**How to Verify:**

1. Create a workflow with 151 or more steps (copy-paste or script).
2. Attempt to save the workflow.
3. Confirm a validation error appears before save.
4. Error message indicates the step count limit (150).

---

## Test 8: Step Count With Custom Setting

**Description:** Verifies that a workflow-level `max-steps` setting is enforced and that validation rejects workflows exceeding that custom limit.

**YAML:**

```yaml
name: Custom Max Steps
triggers:
  - type: manual
settings:
  max-steps: 3
steps:
  - name: step1
    type: data.set
    with:
      x: "1"
  - name: step2
    type: data.set
    with:
      x: "2"
  - name: step3
    type: data.set
    with:
      x: "3"
  - name: step4
    type: data.set
    with:
      x: "4"
```

**Expected Result:** Validation error when saving: "Workflow exceeds the maximum of 3 steps (found 4)".

**How to Verify:**

1. Create and attempt to save the workflow.
2. Confirm validation error appears.
3. Error message references the custom limit (3) and actual count (4).

---

## Test 9: Workflow Output Size Cap (workflow.execute)

**Description:** Verifies that when a parent workflow calls a child workflow via `workflow.execute`, the child's output is capped at the default 5MB. If the child produces output larger than 5MB, `WorkflowOutputSizeExceeded` is thrown.

**Child Workflow YAML (save as "Large Output Child"):**

```yaml
name: Large Output Child
triggers:
  - type: manual
steps:
  - name: produce_large_output
    type: data.set
    with:
      data: "{% for i in (1..600000) %}AAAAAAAAAA{% endfor %}"
```

**Parent Workflow YAML (save as "Parent Calls Child"):**

```yaml
name: Parent Calls Child
triggers:
  - type: manual
steps:
  - name: call_child
    type: workflow.execute
    with:
      workflow-id: "<ID_OF_LARGE_OUTPUT_CHILD_WORKFLOW>"
```

**Expected Result:** `WorkflowOutputSizeExceeded` when the child workflow's output exceeds 5MB.

**How to Verify:**

1. Create and save the child workflow. Note its ID.
2. Create the parent workflow, replacing `<ID_OF_LARGE_OUTPUT_CHILD_WORKFLOW>` in `workflow-id` with the child workflow's ID.
3. Execute the parent workflow.
4. Confirm step `call_child` fails with `WorkflowOutputSizeExceeded`.
5. Error details should indicate the 5MB limit.

---

## Test 10: Normal Workflow (Sanity Check)

**Description:** Verifies that a simple workflow without any limit triggers executes successfully. Serves as a sanity check that the execution engine is functioning correctly.

**YAML:**

```yaml
name: Normal Workflow
triggers:
  - type: manual
steps:
  - name: set_data
    type: data.set
    with:
      message: "Hello World"
  - name: render_template
    type: data.set
    with:
      greeting: "{{ variables.message }}!"
```

**Expected Result:** Completes successfully with no limit errors.

**How to Verify:**

1. Create and execute the workflow.
2. Confirm execution status is COMPLETED.
3. Step `render_template` output contains `greeting: "Hello World!"`.

---

## Quick Validation Checklist

| # | Mechanism | Expected Error / Result | Verified? |
|---|-----------|-------------------------|-----------|
| 1 | LiquidJS OOM prevention | `TemplateSizeLimitExceeded` | [ ] |
| 2 | LiquidJS custom step size | `TemplateSizeLimitExceeded` at ~1KB | [ ] |
| 3 | LiquidJS within limit | Success | [ ] |
| 4 | Default foreach cap (2000) | Stops at 2000 iterations | [ ] |
| 5 | Foreach explicit max-iterations | Only 3 items processed | [ ] |
| 6 | Cumulative output budget | `WorkflowOutputBudgetExceeded` | [ ] |
| 7 | Step count validation (default) | Validation error at 150+ steps | [ ] |
| 8 | Step count custom setting | Validation error at 4 steps (max 3) | [ ] |
| 9 | Workflow output size cap | `WorkflowOutputSizeExceeded` | [ ] |
| 10 | Normal workflow | Success | [ ] |
