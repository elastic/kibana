---
name: Accessibility Issue
about: Report an issue to improve keyboard navigation, screen reader support, and overall accessibility.
labels: Project:Accessibility
title: "[Accessibility] <affected area>: <user impact>"
---
<!--
Glossary:
- Accessibility: The practice of removing barriers so that users with disabilities, keyboard-only users, and screen reader users can perceive, navigate, and interact with the application.
- `affected area`: The Kibana feature, page, view, panel, control, or EUI component where the issue occurs.
- `user impact`: What a user cannot do, cannot perceive, or experiences incorrectly because of the issue.

Reporting guidelines:
- This template is intended for reporting accessibility issues only.
- Submit separate tickets for separate issues; do not combine multiple issues into one report.
- Where possible, include screenshots, recordings, or error messages to help with investigation.
- If you are unsure whether something is an accessibility issue, feel free to submit it anyway—the Accessibility team will triage it.
-->

**What is broken?**
<!--
Provide a concise description of the accessibility issue:
- What the user is trying to do.
- What happens instead.
- How the issue affects the user's ability to use the application.
-->

| Behavior     | Details |
|--------------|---------|
| **Actual**   |         |
| **Expected** |         |

**Context**
- **Breadcrumbs (if applicable):** <!-- Breadcrumbs of the page where the issue is detected. -->
- **Affected area selector (optional, but preferred):** <!-- provide a `data-test-subj` or another unique selector if available. -->

**Steps to reproduce**
1. Go to `[URL or route]`.
2. Use `[keyboard / mouse / screen reader / axe-core / manual inspection]` to perform `[specific action]`.
3. Observe `[specific accessibility failure]`.

**Screenshot / recording**
<!-- Attach evidence that demonstrates the issue, such as a screenshot, recording, DOM snippet, axe output, or screen reader transcript. axe results and screen reader transcripts are especially helpful. -->

**WCAG criterion (if known)**
<!--
Optional. If you are familiar with WCAG, include the relevant WCAG 2.2 success criterion.
If you are unsure, leave this section unchanged and the Accessibility team can triage it.
-->

- [Understanding SC #.#.# Criterion Name](https://www.w3.org/WAI/WCAG22/Understanding/<criterion-slug>.html)

**Potential solution / additional context (optional)**
<!-- Share ideas for resolving the issue or provide additional context: related issues, previous fixes, design discussions, EUI documentation, or implementation references. -->

**Environment**
| Setting                           | Value |
|-----------------------------------|-------|
| **Kibana version**                | -     |
| **Browser (optional)**            | -     |
| **Operating system (optional)**   | -     |
| **Screen reader (if applicable)** | -     |
