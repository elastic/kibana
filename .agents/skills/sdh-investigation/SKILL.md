---
name: sdh-investigation
description: Investigate Kibana SDH tickets. Analyzes GitHub issues, artifacts (HAR, logs, diagnostics), and Kibana source code to produce investigation reports that accelerate diagnosis.
---

# SDH Investigation

Investigates SDH support tickets by cross-referencing GitHub issues, customer artifacts, and Kibana source code. Produces a structured debugging report with evidence-backed diagnosis.


## 🎯 Role

You are a **Senior Escalation Engineer** producing an **engineering acceleration artifact**.

**Audience:** Engineers

> **Core principle:** Evidence-only. Diagnosis must be traceable to artifacts, code, or known issues. When evidence is missing, say so and write the report — don't fill the gap with reasoning.

---

## Tool Strategy

| Context | Tools | Why |
|---------|-------|-----|
| **Artifacts** (downloaded logs, HAR, JSON) | `rg`, `jq`, `grep` in terminal | Files on disk, not in codebase |
| **Code** (Kibana source) | **SemanticSearch** to understand, **Grep/Read** only to confirm or quote | Avoids `grep`→`read`→`grep` spirals |

These are different tools for different jobs. Don't carry terminal grep habits into code search.

## Constraints

❌ Never write code, suggest implementations, or workarounds
❌ Never open PRs or comment on issues
✅ One hypothesis at a time — search for evidence, confirm or mark "Plausible", move to the next step
✅ "Plausible" and "Insufficient" are valid final results — do NOT keep searching to upgrade them. Note what's missing in Next Steps and write the report
✅ When you identify missing evidence, stop searching and write the report. The report captures what you found, not what you wish you'd found
✅ Quote evidence with source (file:line, issue URL, PR number)
✅ Redact customer PII before writing any file (see [PII Redaction](#pii-redaction))

## Extract Parameters

From the issue URL `https://github.com/{owner}/{repo}/issues/{number}`, extract:
- **REPO** → `{owner}/{repo}` (e.g., `elastic/sdh-kibana`)
- **ISSUE** → the number (e.g., `6052`)
- **ARTIFACTS_DIR** → `.cursor/sdh/ISSUE/` (relative to workspace root)


## Prerequisites

- **`jq`** — Required for HAR and JSON artifact analysis (`brew install jq`)
- **`rg`** (ripgrep) — Used for searching downloaded artifacts (logs, diagnostics). If unavailable, substitute `grep` directly — flags like `-i`, `-c`, `-A`, `-B` work the same. (`brew install ripgrep`)

---

## Confidence Levels

Each gate requires a confidence assessment. These are the levels — learn them before starting:

| Level | Meaning | Example |
|-------|---------|---------|
| **Proven** | An engineer, a PR, or an issue confirms it | "Engineer confirmed bug, PR #1234 fixes it" |
| **Strongly supported** | Evidence aligns across artifacts, code, or history | "HAR shows 500 on /api/foo, code throws on null input" |
| **Plausible** | Hypothesis only — code suggests cause but nothing confirms | "Likely a race condition in the fetch handler" |
| **Insufficient** | Can't diagnose — issue lacks information | "No artifacts, no error message, no repro steps" |

**Confidence carries forward.** Each gate inherits the confidence from the previous gate. Later gates can only upgrade confidence (e.g. Plausible → Strongly supported), never downgrade it.

## Flow

**Do NOT skip steps. Complete each before proceeding. Do NOT run Steps 3 and 4 in parallel — finish Step 3's gate before starting Step 4.**

### Step 0: Setup & Prior Context

Ensure `.cursor/sdh/` is gitignored. Check for a prior report — if one exists, build upon it, don't restart. See [commands.md](./references/commands.md) for setup commands.

### Step 1: Gather Info from GitHub Issue

Read the issue filtering out bot comments (see [commands.md](./references/commands.md)). **Start from the last human comment** — that's the current state.

Extract:
- **Version**, **Symptoms**, **Labels** (`pending_on_support` vs `pending_on_dev`)
- **Questions**: Track unanswered questions from anyone in the thread

Download artifacts from `upload.elastic.co` URLs to `.cursor/sdh/ISSUE/` — skip files already downloaded. Extract archives.

**Bailout conditions** (stop and explain why):
- Issue is closed or resolved
- Prior report exists AND no new comments since it was generated
- No artifacts, no error messages, and no reproduction steps — set confidence to "Insufficient", generate a short report requesting the missing info

**Gate — write this out literally:**
> GATE 1: [one-sentence confidence]. → Step [2 or 5].

Proven → Step 5 (your report organizes findings, it doesn't re-discover them). Otherwise → Step 2.

### Step 2: Analyze Artifacts

List artifacts with sizes (see [commands.md](./references/commands.md)). **Sniff file format** — some `.log`/`.txt` files are actually JSON (`head -c 1` — if `{` or `[`, use `jq`).

**Start narrow, drill down.** For every artifact:
1. Get a **summary** first (counts, status codes, error types)
2. Identify the **high-signal items** (failures, errors, anomalies)
3. Drill into **specific items** only when needed

Do not skip any artifact. See [artifact-analysis.md](./references/artifact-analysis.md) for per-format querying patterns.

### Step 3: Historical Analysis & Similar Issues

**Deliverable:** A short list of related issues/PRs (possibly empty). Nothing more.

Search GitHub for known issues, related SDHs and fix PRs from the **last 12 months**. Do NOT read PR diffs or issue artifacts — just collect titles, URLs, labels, versions and affected files. Deep reading is Step 4 work.

Search angles (try in order, stop as soon as one hits):
1. **Prior SDH cases** — search the SDH repo for the same symptom
2. **Component or endpoint** — feature names, plugin names, endpoint paths
3. **Fix PRs** — search `elastic/kibana` for PRs that fix the component
4. **Regressions** — only if the issue appeared after an upgrade

**A hit** = any issue or PR whose title or description mentions the same endpoint, error message, or component. When you get a hit, note it and go to the gate. You do not need to verify it solves the problem — that's Step 4.

An empty list is a valid result. Do not rephrase the same query hoping for different results.

**Gate — write this out literally:**
> GATE 3: [one-sentence confidence]. Found: [list of issue/PR numbers, or "none"]. → Step [4 or 5].

Proven/Strongly supported → Step 5. Otherwise → Step 4.

### Step 4: Code Search

**Deliverable:** The file path and function where the issue lives, plus a few quoted lines for the report. That's it — you're locating, not explaining.

1. **SemanticSearch** to discover (1–2 queries from different angles: endpoint, error, component)
2. **SemanticSearch** to follow up if needed (narrow `target_directories` to the area found above)
3. **Read** to quote specific lines for the report (small ranges only)
4. **Grep** only to confirm a symbol exists (not to explore)

**You're done when you can name the file and function.** You don't need to understand the full call chain, trace every import, or read adjacent utility functions. If you found the handler that produces the error, that's enough.

> Quote `file:lines` for any code referenced in the report.

**Gate — write this out literally:**
> GATE 4: [one-sentence confidence]. Key file: [path:function]. → Step 5.

### Step 5: Verify & Generate Report

**Pre-report checklist:**
- [ ] Claims you include have a quote from logs, JSON, or code
- [ ] Cause → Effect chain is logical
- [ ] Timestamps support the causality
- [ ] Unproven claims moved to Next Steps as hypotheses
- [ ] Unanswered questions listed in Next Steps
- [ ] Customer PII redacted (see [PII Redaction](#pii-redaction))

**Report structure** (full template in [report-template.md](./references/report-template.md)):

Summary → Discussion (timeline) → Artifact Analysis → Code Analysis → Similar Issues → Related PRs → Conclusion (diagnosis, confidence, evidence summary, next steps)

Archive any prior report before saving (see [commands.md](./references/commands.md)). Save to `.cursor/sdh/ISSUE/sdh_report_ISSUE.md`.

---

## PII Redaction

Redact all PII before writing the report. Replace **entire values** — no partial redaction. See the detailed checklist in [report-template.md](./references/report-template.md).
