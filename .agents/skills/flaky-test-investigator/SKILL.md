---
name: flaky-test-investigator
description: >-
  Investigate Scout, FTR, and Jest flaky test failures in Kibana. Use when
  triaging a failed-test issue, a Buildkite-reported failure, a test path
  that has been failing intermittently, or any time the user asks to look at
  a flaky test, deflake a test, or stabilize a test.
---

# Flaky Test Investigator

Investigate a flaky Scout, FTR, or Jest test failure and determine what should be done about it.

- The outcome should be an accurate diagnosis, not a quick fix that treats the symptom.
- Valid outcomes include "this is a real product bug, escalate to the owning team", "this is environmental and will likely self-resolve", or "there isn't enough data to draw a confident conclusion".

## Prerequisites

### Buildkite access

You may access Buildkite either with `bk` CLI or direct API calls (ensure `BUILDKITE_API_TOKEN` variable exported with the Buildkite token). Required Buildkite token scopes:

- `read_builds`: browse pipelines, builds, and job logs.
- `read_artifacts`: list and download build artifacts (Scout HTML failure reports, screenshots, FTR failure-debug HTML, etc.). See "Did the environment cause the failure?" for the specific paths and how to use them.

### GitHub access

Run `gh auth status` to confirm `gh` is authenticated.

## Investigation

Identify the test runner for the failing test(s) and follow the framework-specific investigation guidance:

- Scout: `reference/scout.md`
- FTR: `reference/ftr.md`
