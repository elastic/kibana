# Workflow-Driven LLM Anonymization — Architecture Overview

> Concise reference. Full design: [`rfc_workflow_driven_anonymization.md`](./rfc_workflow_driven_anonymization.md).

## What this is

A single synchronous AOP-style "around" lifecycle hook at the point where every Kibana LLM call passes through. A single YAML workflow anonymizes the full prompt before a special `call_site.proceed` step suspends execution, the real LLM call executes, and then the workflow resumes to restore originals in the response. Anonymization logic lives in YAML workflows that admins enable per space. No changes needed in any individual LLM consumer.

## Changes by plugin

### Generic workflow framework
_`@kbn/workflows-extensions` — the OSS plugin that owns trigger and step registration (modified)_

Gains the concept of a **synchronous hook** — a trigger that blocks the caller until all subscribed workflows have run and returns their combined output. Previously triggers were fire-and-forget. The new sync variant is declared by adding an optional `sync` block to `registerTriggerDefinition`, which adds a timeout, a failure policy, and an option for chained execution where each workflow receives the previous one's output rather than the original event.

The execution engine also gains **suspend/resume support** for the `call_site.proceed` sentinel step. When the executor encounters this step, it saves a checkpoint (accumulated context + rendered `with` values) and returns a `suspended` status. The caller then executes the real LLM call (the "proceed function"), and resumes the workflow with the LLM response injected as the proceed step's output.

Two methods added to the public start contract — `setSessionCapabilities` and `clearSessionCapabilities` — let the workflow runner manage a per-session capability store directly. This is needed so step types can access call-scoped state (the anonymization context) without it being passed through the YAML.

### Inline workflow executor
_`@kbn/workflows-execution-engine` — the x-pack plugin that runs workflow steps (modified)_

A lightweight in-process runner that evaluates YAML workflow steps one by one, using the existing templating engine for expressions and condition guards. It runs entirely in memory — no background jobs, no database writes. This is what makes synchronous hook execution fast enough to sit in the hot path of every LLM call.

### Workflow management
_`@kbn/workflows-management` — the OSS plugin that stores and orchestrates workflows (modified)_

Gains two capabilities:

**Hook invocation.** When a hook fires, the workflow management layer looks up which workflows in the current space are subscribed to that hook and have been enabled by the admin. It runs them in sequence using the inline executor, threading each workflow's output into the next. If no workflows are enabled it falls back gracefully.

**Default workflow seeding.** On startup, a single default workflow is written into the workflow store if it does not already exist — the around-completion workflow that handles both anonymization (pre-proceed) and de-anonymization (post-proceed) in one YAML document. It is seeded as disabled so nothing changes for existing deployments until an admin explicitly turns it on. If an admin has previously deleted it, it is not recreated. If the bundled YAML has been updated (e.g. a bug fix), the stored copy is updated while preserving admin-controlled settings like the enabled state.

A one-shot migration runs on first startup after upgrade: it reads any regex-based anonymization rules the admin previously configured in the Observability AI Assistant settings page and imports them into the seeded workflow. This migration runs once and does not repeat.

### Inference lifecycle hook registrations and step types
_`@kbn/inference-workflows` — x-pack plugin that bridges inference and workflows (new); also ships the default workflow YAML via `@kbn/default-anonymization-workflows` content package (new)_

A dedicated plugin registers the single `inference.aroundCompletion` hook definition with the framework — specifying its input and output shapes, timeout, and failure policy. This plugin also registers all the step types that workflows can use, including the PII anonymization step, the PII restore step, and the `call_site.proceed` sentinel step (documented-only — the executor handles it natively).

A separate plugin is required here to avoid a circular dependency. The step types (e.g. `ai.pii`) need access to `inference` capabilities at runtime, so if they were registered directly inside `workflowsExtensions`, that plugin would need to depend on `inference`. But `inference` itself optionally depends on `workflowsExtensions` to call `invokeHook`. That would be a cycle. By placing the registrations in `inference_workflows` — a plugin that depends on both `inference` and `workflowsExtensions`, and that nothing depends on in return (except `workflowsManagement` as an optional seeding dep) — the dependency graph stays a clean DAG and `workflowsExtensions` retains zero knowledge of AI or inference concepts.

### Inference plugin
_`@kbn/inference` — the x-pack plugin every LLM call in Kibana passes through (modified)_

The actual LLM call is wrapped inside a single `aroundCompletion` hook invocation. The hook:

1. Runs the pre-proceed steps of the subscribed workflow, which detect and replace PII values with opaque tokens. A short note is appended to the system prompt telling the LLM what the tokens represent and how to handle them. If no PII was found, nothing is appended.
2. Suspends at `call_site.proceed` — the inference plugin then executes the real connector call and returns the response to the workflow.
3. The workflow resumes and runs the post-proceed steps, which restore original values in the LLM's response before it is returned to the caller.

A small piece of call-scoped state — the mapping between tokens and their original values — is created at the start of each call and discarded when the call completes. It is never written to disk. Token values are deterministic: the same piece of PII always produces the same token within a session, even across Kibana restarts or different nodes, because the token is derived from a stable server secret and the session identifier rather than from stored state.

If anything in the anonymization workflow fails, the call is rejected by default — raw PII is never silently sent to the model. Admins can opt into a permissive mode if service continuity is more important than the safety guarantee.

## Key design decisions

| Concern | Decision |
|---|---|
| Who is covered | Every LLM call in Kibana, automatically, with no per-consumer changes |
| How state is managed | Call-scoped only — no session store, no TTL, no eviction |
| What happens on failure | Fail-closed by default — the call is rejected, not silently passed through |
| How admins control it | The workflow `enabled` toggle per space — no separate configuration needed |
| What is out of scope | Field-level rules, NER-based detection, in-Kibana data |
