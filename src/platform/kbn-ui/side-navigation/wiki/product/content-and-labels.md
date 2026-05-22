# Content, labels, and icons

## Overview

Information architecture for side navigation should be validated with users through card sorting, tree testing, or equivalent methods before shipping. These rules keep labels readable and placement predictable across Elastic solutions.

## Primary menu limits

| Area | Limit | Notes |
| --- | --- | --- |
| Top primary items | **12** max (logo excluded from overflow math) | Items beyond cap → overflow to [More](./primary-menu.md#more-menu) |
| Bottom / footer | **5** max, **3** recommended | Utilities only |

Prioritize **global, high-traffic** contexts in the primary column; push depth into the secondary menu.

## Cross-solution consistency

- **Discover** and **Dashboards** should be the **first two items after the solution logo** in every solution where they apply.
- Exceptions: Workchat (chat experience takes precedence), Cloud (items not relevant), and other documented solution-specific IA.
- Shared concepts (for example **Settings**) should sit in the **same position** across solutions.
- If several items share a similar context, consider unifying them under a **single primary parent** with many secondary children rather than multiple thin primary siblings.

## Labels

- **Concise:** prefer one word, ideally **≤ 10–11 characters** (~110px) before truncation.
- Two-word labels are acceptable, with the second word on a new line; keep each word short.
- **Sentence case** per Elastic writing guidelines. Follow the Elastic Glossary for product names — for example, "Service inventory" (not "Service Inventory"), and "Machine learning" as a general concept vs "Machine Learning" when referring to the specific Kibana app.
- Avoid **CamelCase** in navigation names.
- Do not use **CTAs in page headers** that duplicate secondary menu labels.

## Icons

- Top primary items use icons **plus** labels in expanded mode, providing additional confidence when navigating abstract domains.
- Footer icons must be **self-explanatory** because labels are always hidden — use simple, conventional metaphors (the gear icon for Settings is the reference pattern).
- Prefer simple metaphors; when the metaphor is weak, rely on the label (top items only).

## Capitalization

Navigation copy follows [EUI voice and word choice](https://eui.elastic.co). When in doubt, use sentence case and check the Elastic Glossary for branded terms.

## External links

Items that leave Kibana (for example Cloud console) use `isExternal: true`: shows an external arrow icon, opens in a **new browser tab**.
