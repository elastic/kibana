---
name: context-engine-team
description: Conventions and workflows for the Context Engine team (part of Agent Builder) when working in the elastic/kibana and elastic/search-team repos. Use when creating issues, opening PRs, or reviewing PRs for any Context Engine workstream (AI indices, KIs, sources, KI-creation automations, setup/retrieval skills, agent traces, the feedback loop), so that tickets and PRs follow the team's structure, labels, reviewers, and quality gates.
---

# Context Engine Team

Shared working conventions for the **Context Engine** effort (part of the Agent Builder team, `team:agent-builder`). This skill captures how *this* team writes issues and PRs — on top of the generic GitHub tooling — so the output is consistent, reviewable, and immediately actionable by both humans and Claude Code.

## What the Context Engine is (shared context)

An `ai_index` is a curated store of **Knowledge Items (KIs)** that agents query for good context. Around it sit the team's workstreams:

- **sources** — raw upstream data an ai_index draws knowledge from.
- **KI-creation automations** — Kibana Workflows that read a source and write KIs into the backing store.
- **setup skill** — bootstraps KIs from sources (0 → working index).
- **retrieval skill** — how agents query the index at runtime (ES\|QL hybrid).
- **traces & product monitoring** — agents emit OTel traces when they use the index.
- **feedback loop** — turns traces into fixable problems (**cases → patterns → improvements**) so the index improves with use.

**No single workstream defines the team.** This skill captures conventions that apply across *all* Context Engine work. Workstream-specific vocabulary (for example the feedback loop's *cases / patterns / improvements*, where "issue" is reserved for GitHub issues) belongs in that workstream's own docs — treat it as local, not a team-wide law.

Tracking anchors (non-exhaustive): Context Engine spans multiple workstreams under the Agent Builder team (`team:agent-builder`). Feedback Loop workstream **elastic/search-team#15386** (epic **#15572**); Product Monitoring & Traces **#14067**.

## Subfiles — what to read and when

**Reference (understand the system):**

| File | When to use it |
|------|----------------|
| **[architecture.md](./architecture.md)** | To understand the whole Context Engine: the `ai_index` + KIs + sources + automations + setup/retrieval skills + traces, the cases → patterns → improvements feedback loop, plugin topology & load order, the two Task Manager tasks, storage, and Agent Builder integration. Read this first when onboarding or planning a change. Marks what is MERGED vs PoC. |
| **[interfaces.md](./interfaces.md)** | To look up an exact contract: HTTP API routes (paths, versions, privileges, request/response), plugin setup/start contracts and the cross-plugin registration extension points, document schemas (Case/Pattern/Improvement + AI-index model), Agent Builder tool/attachment/skill ids, and the Workflows API. Reference-style; each entry tagged MERGED or PoC. |
| **[conventions.md](./conventions.md)** | Before writing code: the team's do/don't rules — architectural invariants (dependency direction, no cross-bundle value imports), feature-flag pattern, server/browser patterns, Workflows (KI-automation) idioms, i18n, testing, tooling & verification gates, and canonical file layout. |

**Workflow (do the task):**

| File | When to use it |
|------|----------------|
| **[creating-issues.md](./creating-issues.md)** | Whenever you create or restructure a GitHub issue for Context Engine work. Defines the **guided, plan-mode-style interview** (ask developer-vs-product, pick the **issue kind** — *A: high-level feature/epic* vs *B: implementation task, ~1:1 with a PR* — choose how much conversation history to capture, optionally via `scripts/derive_issue_from_conversation.sh` which offloads the transcript to a separate `claude -p`, then classify every requirement as hard vs open), the **two body templates** (product-framed epic vs the four-section implementation task), and the repo/label/reviewer/sub-issue-linking mechanics. |
| **[implementation.md](./implementation.md)** | While implementing an issue. How to build to the team's bar: collaborate with the user on decisions, use subagents when it helps, hold the quality line (no shortcuts, root-cause fixes), keep comments minimal (public interfaces fully documented), and always validate (type-check, write & run tests) before committing. |
| **[creating-prs.md](./creating-prs.md)** | Whenever you open a pull request in `elastic/kibana` for Context Engine work. Defines PR sizing/splitting rules, the PR body template, labels, reviewers/CODEOWNERS, the load-bearing architectural constraints, and the verification gates every PR must pass. |
| **[review-prs.md](./review-prs.md)** | Whenever you review a PR. Drives the parallel persona-based review harness (one agent per persona → aggregate → validate → optional `deepagent` deep-analysis → **produce a validated review report and stop**; it does not post to GitHub), plus the Context-Engine-specific review criteria and reviewer boundaries. Its agent prompts, persona/criteria data, and helper scripts live in `prompts/`, `data/`, and `scripts/`. |

> **Skill layout:** runnable helpers live in **`scripts/`**, subagent prompt templates in **`prompts/`**, and reference data (personas, review criteria, knowledge bases) in **`data/`**.

> **MERGED vs PoC:** the Context Engine core (AI-index API, model, routes, UI shell) is merged on `main`; the **feedback loop** (cases/patterns/improvements, the Task Manager tasks, the classifier, the Agent Builder hand-off) is **not yet merged** — it lives in draft PR elastic/kibana#282241 and the rebuild-handover gist. The reference files tag each item accordingly; trust the code for merged surfaces and the gist/PR for the loop.

## How to use this skill

0. First time on this machine: follow **[setup.md](./setup.md)** to install/authenticate the prerequisites (`gh` + scopes, `claude` CLI, `python3`, Node 24). Skip if already set up.
1. Read this file for shared vocabulary and tracking links.
2. Open the relevant subfile for the task at hand (issue vs PR) and follow it.
3. For generic mechanics not covered here (exact `gh` invocations, project-board scopes), the team conventions in the subfiles take precedence; fall back to the repo's generic `gh-create-issue` / `kbn-github` skills only for details this skill doesn't specify.

## Non-negotiables (apply to both issues and PRs)

- **Feature flag:** every user-facing Context Engine surface is gated behind the `contextEngine:enabled` advanced setting (routes 404, app inaccessible when off).
- **Dependency direction:** `context_engine` must **never** depend on `agentBuilder` (server or browser). The load order is `agentBuilder → agentBuilderSml → contextEngine`; integration is inverted through `agent_builder_platform`.
- **Reviewer boundaries:** `context_engine` is `@elastic/context-eng`; `allow_lists.ts`, `agent_builder_platform`, the `agent_builder` tracing surface, and the `@kbn/llm-trace-waterfall` dependency are `@elastic/workchat-eng`.
