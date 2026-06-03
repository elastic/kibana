---
name: Accessibility Issue
about: Report an issue to improve keyboard navigation, screen reader support, and overall accessibility.
labels: Project:Accessibility
title: "[Accessibility] <affected area>: <user impact>"
---
<!--
Glossary:
- `affected area`: The Kibana feature, page, view, panel, control, or EUI component where the issue occurs.
- `user impact`: What a user cannot do, cannot perceive, or experiences incorrectly because of the issue.

Reporting guidelines:
- This template is for accessibility issues only.
- Do not report multiple issues in a single ticket.
- Provide a concise and specific description of the problem.
- Remove any sections that are not applicable before submitting.
-->

**What is broken?**
<!-- Provide a short, action-oriented summary of the accessibility problem: describe the incorrect behavior and its impact on the user. -->

**Context**
- **Breadcrumbs (if applicable):** <!-- Breadcrumbs of the page where the issue is detected. -->
- **Affected area selector (optional, but preferred):** <!-- `data-test-subj` or another unique selector. -->

**Steps to reproduce**
1. Go to `[URL or route]`.
2. Use `[keyboard / mouse / screen reader / axe-core / manual inspection]` to perform `[specific action]`.
3. Observe `[specific accessibility failure]`.

**Screenshot / recording**
<!-- Attach a screenshot, recording, DOM snippet, axe output, or screen reader transcript that demonstrates the issue. Clear axe results or a screen reader transcript are especially useful. -->

**Actual vs. expected**
| Behavior     | Details |
|--------------|---------|
| **Actual**   |         |
| **Expected** |         |


**WCAG criterion**
<!-- Link to the applicable WCAG success criterion. Kibana's accessibility baseline is WCAG 2.2. -->
- [Understanding SC #.#.# Criterion Name](https://www.w3.org/WAI/WCAG22/Understanding/<criterion-slug>.html)

**Potential solution / additional context (optional)**
<!-- Share ideas for resolving the issue or provide additional context: related issues, previous fixes, design discussions, EUI documentation, or implementation references. -->

**Environment**
| Setting                           | Value |
|-----------------------------------|-------|
| **Kibana version**                | -     |
| **Browser (optional)**            | -     |
| **Screen reader (if applicable)** | -     |
