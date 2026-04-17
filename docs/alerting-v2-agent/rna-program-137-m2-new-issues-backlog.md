# M2 rule management — proposed new Kibana issues

Source program meta: [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137) (“[Meta] [UI] V2 Rule Management Milestone 2”). That epic **no longer uses a markdown child-issues table** in the description; implementation work is tracked as **GitHub sub-issues** on #137.

Use this list when opening **new** `elastic/kibana` issues. Before filing, check the “Already tracked” section to avoid duplicates.

---

## Created from this backlog

*Artifact-backed **rule details** (**#263614** related rules display, **#263615** linked dashboards display, **#263625** matching notification policies) are sub-issues of **[elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137)** (rule management meta). **Rule authoring** in the form — **dashboard** artifacts (**#260048**; closed duplicate **#263616**) **auto related-rule** artifacts when ES|QL references rule metadata (**#263623**), **reintroduce condition** in the rule model (**#263806**), and **cross-project search** for rule authoring (**#263646**) — are sub-issues of **[elastic/rna-program#158](https://github.com/elastic/rna-program/issues/158)** (Rule Authoring M2).*

### [elastic/kibana#263614](https://github.com/elastic/kibana/issues/263614) — Related rules (display)


| Item                | Detail                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] [UI] Rule details — display configured related rules`                                                                                                                                                                                                                                                                                                            |
| **Program link**    | Sub-issue of [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137) (rule management meta)                                                                                                                                                                                                                                                                |
| **Labels**          | `Team:ResponseOps`, `Team:actionable-obs`                                                                                                                                                                                                                                                                                                                                       |
| **#137 body scope** | “Display related rules (What does related mean?)” under **Improvements to rule details**                                                                                                                                                                                                                                                                                        |
| **Scope decided**   | M2: show related rules **only when attached as rule artifacts**; **artifact `type`/validation/limits, authoring, and API** are **out of scope** — separate configuration ticket (to be linked from #263614 when filed).                                                                                                                                                         |
| **Artifacts**       | Same triple as dashboards: `**id`** (row), `**type**`, `**value**` (related-rule id TBD in authoring ticket). See issue body + [kibana#260048](https://github.com/elastic/kibana/issues/260048) field table. Code: `ruleSavedObjectAttributesSchema`, `rule_sidebar_runbook_tab.tsx`, `artifactSchema` in `rule_data_schema.ts`, `@kbn/alerting-v2-constants` / `artifacts.ts`. |


### [elastic/kibana#263615](https://github.com/elastic/kibana/issues/263615) — Linked dashboards (display)


| Item                | Detail                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] [UI] Rule details — display linked dashboards (artifact-backed)`                                                                                                                                                                                                                                                                           |
| **Program link**    | Sub-issue of [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137) (rule management meta)                                                                                                                                                                                                                                          |
| **Labels**          | `Team:ResponseOps`, `Team:actionable-obs`                                                                                                                                                                                                                                                                                                                 |
| **#137 body scope** | “Display attached dashboards (high)” under **Improvements to rule details**                                                                                                                                                                                                                                                                               |
| **Scope decided**   | M2: display `**dashboard`** artifacts; **authoring** (attach, search, `**alert` and `signal`**, **deleted/missing** row treatment in form) lives in [kibana#260048](https://github.com/elastic/kibana/issues/260048). **Rule details** must show a **deleted / missing dashboard** state when the SO no longer resolves (read-only; removal via #260048). |
| **Artifacts**       | Same persistence model as existing artifacts (see `ruleSavedObjectAttributesSchema` → `artifacts` and runbook UI in `rule_sidebar_runbook_tab.tsx`); issue body references `@kbn/alerting-v2-constants` / `artifacts.ts` for type-specific value limits.                                                                                                  |


### [elastic/kibana#260048](https://github.com/elastic/kibana/issues/260048) — Rule authoring: attach investigation dashboards (artifact)


| Item                | Detail                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] Support attaching investigation dashboards to rules via artifact system`                                                                                                                                                                                                                    |
| **Program link**    | Sub-issue of [elastic/rna-program#158](https://github.com/elastic/rna-program/issues/158) (Rule Authoring M2)                                                                                                                                                                                              |
| **#137 body scope** | “Allow attaching dashboards (high)” under **# Rule authoring**                                                                                                                                                                                                                                             |
| **Artifact fields** | Each `artifacts[]` entry has `**id`** (stable **row** id, not the dashboard id), `**type`** (e.g. `'dashboard'`), and `**value**` (for dashboards: **dashboard saved object id** only). See `RuleArtifact` / `artifactSchema` / `ruleSavedObjectAttributesSchema` — #260048 issue body has the full table. |
| **Scope**           | `**type: 'dashboard'`** + `**value**` = dashboard SO id + generated `**id**` per row; `**alert` and `signal**` kinds; **Dashboard API** search (`/api/dashboards`); **stale** row UX when dashboard deleted (remove in form).                                                                              |
| **Duplicate**       | [kibana#263616](https://github.com/elastic/kibana/issues/263616) was closed as **duplicate of #260048** (same authoring scope).                                                                                                                                                                            |


### [elastic/kibana#263623](https://github.com/elastic/kibana/issues/263623) — Rule authoring: auto-attach related rule when ES|QL references rule metadata


| Item                | Detail                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] Rule authoring — auto-attach related rule artifact when ESQL references rule metadata`                                                                                                                                                                                                                                                                                       |
| **Program link**    | Sub-issue of [elastic/rna-program#158](https://github.com/elastic/rna-program/issues/158) (Rule Authoring M2)                                                                                                                                                                                                                                                                               |
| **Labels**          | `Team:ResponseOps`, `Team:actionable-obs`                                                                                                                                                                                                                                                                                                                                                   |
| **#137 body scope** | Complements **# Rule authoring** — “Automatic attachment of related rule for authoring a rule on a rule” (this ticket: **detect** dependency via ES                                                                                                                                                                                                                                         |
| **Scope**           | Higher-order / cross-rule queries in the v2 rule form: when the authored query references rule metadata, **auto-populate** related-rule artifacts (dedupe, multi-rule and invalid-id UX per issue). Pairs with display work in [kibana#263614](https://github.com/elastic/kibana/issues/263614) and the artifact model in [kibana#260048](https://github.com/elastic/kibana/issues/260048). |


### [elastic/kibana#263646](https://github.com/elastic/kibana/issues/263646) — Cross-project search for rule authoring (management + Discover)

| Item | Detail |
|------|--------|
| **Title** | `[Alerting V2] [UI] Cross-project search for rule authoring (management + Discover)` |
| **Program link** | Sub-issue of [elastic/rna-program#158](https://github.com/elastic/rna-program/issues/158) (Rule Authoring M2) |
| **Labels** | `Team:ResponseOps`, `Team:actionable-obs` |
| **#137 body scope** | "Support for rule authoring cross project search, both in management and Discover" under **## Cross project search** |
| **Scope** | Wire `cps` as optional dependency; register picker access (READONLY on rule create/edit, DISABLED on rules list); ensure ES|QL preview queries inherit space-default `project_routing`; Discover-to-rule authoring scope mismatch handling. |

### [elastic/kibana#263806](https://github.com/elastic/kibana/issues/263806) — Reintroduce condition in the rule model

| Item | Detail |
|------|--------|
| **Title** | `[Alerting V2] Rule authoring — reintroduce condition in the rule model` |
| **Program link** | Sub-issue of [elastic/rna-program#158](https://github.com/elastic/rna-program/issues/158) (Rule Authoring M2) |
| **Labels** | `Team:ResponseOps`, `Team:actionable-obs` |
| **#137 body scope** | "Will we need to add condition back?" under **# Rule authoring** |
| **Scope** | Define a condition schema on the rule SO (type + params); required vs optional for ES|QL-only rules; relationship to GUI rule builder and raw editor; migration path for existing v2 rules. |

### [elastic/kibana#263625](https://github.com/elastic/kibana/issues/263625) — Notification policies matching a rule (display)

| Item | Detail |
|------|--------|
| **Title** | `[Alerting V2] [UI] Rule details — surface matching notification policies (incl. catch-all)` |
| **Program link** | Sub-issue of [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137) (rule management meta) |
| **Labels** | `Team:ResponseOps`, `Team:actionable-obs` |
| **#137 body scope** | "Display notification policies (notification policies that match criteria or are catch all) (high)" under **Improvements to rule details** |
| **Scope** | A notification policy **matches** a rule when its matcher filter references `rule.*` metadata (e.g. `rule.id`, `rule.tags`) whose values match the current rule, **or** the policy is a catch-all (no matchers / always-true). Read-only display on rule details; editing stays in notification policies management. |

### [elastic/kibana#263619](https://github.com/elastic/kibana/issues/263619) — Rules list: hide Streams-managed signal rules


| Item                | Detail                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] [UI] Rules list — hide Streams auto-created signal rules`                                                                                                                                                      |
| **Program link**    | Sub-issue of [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137)                                                                                                                                     |
| **Labels**          | `Team:ResponseOps`, `Team:actionable-obs`                                                                                                                                                                                     |
| **#137 body scope** | Aligns with **Improvements to the rule list** (reduce noise from system-managed rules).                                                                                                                                       |
| **Scope**           | Default list hides **Streams auto-created `signal`** rules; **identification contract** TBD with Streams; **product table** in the issue asks whether to allow **“internal”** opt-in vs always hidden vs separate admin view. |


### [elastic/kibana#263620](https://github.com/elastic/kibana/issues/263620) — Rules list: grouping view (tags)


| Item                | Detail                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**           | `[Alerting V2] [UI] Rules list — grouping view (tags)`                                                                                                      |
| **Program link**    | Sub-issue of [elastic/rna-program#137](https://github.com/elastic/rna-program/issues/137)                                                                   |
| **Labels**          | `Team:ResponseOps`, `Team:actionable-obs`                                                                                                                   |
| **#137 body scope** | **## Group by support** — “Grouping view in rules list, tags”                                                                                               |
| **Scope**           | Grouped browsing on the v2 rules list; **tags** as primary dimension; interaction with filters, search, sort, pagination, bulk actions TBD in issue/design. |


---

## Proposed new issues (by theme)

### Rule details — metrics and relationships

*Related rules, linked dashboards, and matching notification policies (**display**): [kibana#263614](https://github.com/elastic/kibana/issues/263614), [kibana#263615](https://github.com/elastic/kibana/issues/263615), [kibana#263625](https://github.com/elastic/kibana/issues/263625) — sub-issues of **[#137](https://github.com/elastic/rna-program/issues/137)**. Rule form **authoring**: [kibana#260048](https://github.com/elastic/kibana/issues/260048) (dashboard artifacts), [kibana#263623](https://github.com/elastic/kibana/issues/263623) (auto related-rule artifacts from ES|QL rule metadata) — sub-issues of **[#158](https://github.com/elastic/rna-program/issues/158)**. See **Created from this backlog**.*


| Proposed issue title (working)                                                                 | Body text (from #137)                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **[Alerting V2] [UI] Rule details — KPIs and dashboard-oriented visualizations**               | “KPIs for rule details page, visualizations we want for dashboard (what visualizations and KPIs do we want?)” |


### Rule list — actions and layout

*Streams-managed signal rules in the default list: [kibana#263619](https://github.com/elastic/kibana/issues/263619).*


| Proposed issue title (working)                                            | Body text (from #137)                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Alerting V2] [UI] Rules list — “Run now” action (single and/or bulk)** | “New single and bulk actions (updating api key, run now) (high)” — *API key is tracked separately; “run now” still needs its own issue if none exists.* |


### Rule list — grouping

*Grouping / tags on the v2 rules list: [kibana#263620](https://github.com/elastic/kibana/issues/263620) (“Grouping view in rules list, tags”).*

### Cross-surface — authoring and management

*Cross-project search for rule authoring: [kibana#263646](https://github.com/elastic/kibana/issues/263646) — sub-issue of **[#158](https://github.com/elastic/rna-program/issues/158)**. See **Created from this backlog**.*


### Rule authoring — relationships, templates, model

*Attach dashboards in the v2 rule form: [kibana#260048](https://github.com/elastic/kibana/issues/260048). Auto-attach related rules when ES|QL references `**rule.id`** / `**rule.tags**` (etc.): [kibana#263623](https://github.com/elastic/kibana/issues/263623).*


| Proposed issue title (working)                                                          | Body text (from #137)                                                              |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **[Alerting V2] [UI] Rule authoring — manually add related rule**                       | “Manual add related rule”                                                          |
| **[Alerting V2] Rule authoring — template support (product + UX)**                      | “Template support?”                                                                |
| **[Alerting V2] Discover — rule authoring audit (controls and edge cases)**             | “Discover rule authoring audit (What happens when you use controls, for example?)” |
| **[Alerting V2] [UI] Rule authoring — GUI-based rule builder**                         | Visual rule builder that generates ES|QL under the hood. Lets users create rules through a structured GUI (source, conditions, thresholds) without writing ES|QL directly. One-way view/edit of generated query for advanced users. Aligns with rna-program#158 scope: “GUI control layer / visual query builder (generates ES|QL under the hood)” and rna-program#123 (GUI-based rule creation). |
| **[Alerting V2] [UI] Rule authoring — rule builder edit experience (locked builder type)** | Edit experience for rules created via the GUI rule builder. The builder type (e.g. threshold, ratio, no-data) is locked after creation — users cannot switch builder types on an existing rule. Editing stays within the same structured GUI; users who need a different builder type must create a new rule. Define UX for communicating the locked type and guiding users accordingly. |
| **[Alerting V2] [UI] Rule authoring — inline action policy from the rule form**       | Allow users to inline an action policy (formerly notification policy) directly from the rule form. Creates a simple action policy behind the scenes and connects it to the rule automatically, so users don’t have to leave the rule form to set up basic notification routing. Full action policy management (complex matchers, multiple channels, editing) stays in the dedicated action policies UI. |

### Execution history — table UX beyond filtering

These align with execution-focused scope in #137 (and items that were previously called out as follow-ups before the meta switched to sub-issue-only tracking).


| Proposed issue title (working)                                                   | Body text / anchor (from #137)                                                                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **[Alerting V2] [UI] Execution history — sorting**                               | Supports “Including filtering on rule state - failed, success, etc” and the execution tab narrative under **## Execution state**. |
| **[Alerting V2] [UI] Execution history — URL state (shareable filters / range)** | Aligns with “execution history additional features” in the overview.                                                              |


### Execution history — platform / API


| Proposed issue title (working)                                                             | Body text / context (from #137)                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Alerting V2] [API] Rule execution history — queries and endpoints for rule details UI** | Program [discussion #330](https://github.com/elastic/rna-program/discussions/330) (linked from #137): prerequisites for “API implementation / queries to power the tables” for execution details. Maps to overview: “execution history additional features” and “## Execution state” / dependency chain for the Execution tab. |


### Rule authoring — YAML sync mode

| Proposed issue title (working) | Body text / context |
|--------------------------------|---------------------|
| **[Alerting V2] Rule authoring — YAML sync mode** | Support defining and managing v2 rules via YAML (file-based). Enables GitOps / infrastructure-as-code workflows: author rules in YAML, sync to Kibana, and keep the YAML source of truth in version control. Scope TBD: import/export, continuous sync, conflict resolution, schema validation, CLI tooling. |

### Bulk operations and safety


| Proposed issue title (working)                                               | Body text / anchor (from #137)                                                                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Alerting V2] [UI] Rules list — bulk enable / disable / delete (M2 gaps)** | Overview: “bulk operations”. *If bulk delete/enable/disable is already fully covered by closed issues, use this slot for a short “remaining gaps” ticket instead.* |
| **[Alerting V2] [UI] Delete rule(s) — warn when active alerts exist**        | Safety / delete UX aligned with rule lifecycle management in the overview.                                                                                         |


---

## Already tracked in Kibana — attach under the right program epic (do not re-file)

Link **rule management / rule details** work under [rna-program#137](https://github.com/elastic/rna-program/issues/137) and **rule authoring** work under [rna-program#158](https://github.com/elastic/rna-program/issues/158) instead of opening duplicates:


| Body text (from #137)                                                     | Existing tracker (examples)                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| “Including the Execution tab in rule details”                             | [kibana#251348](https://github.com/elastic/kibana/issues/251348)                     |
| “Including filtering on rule state - failed, success, etc” (list-level)   | [kibana#256552](https://github.com/elastic/kibana/issues/256552)                     |
| “Filtering on source … (high)”                                            | [kibana#256553](https://github.com/elastic/kibana/issues/256553)                     |
| “Flyout for quick rule info (high)”                                       | [kibana#260081](https://github.com/elastic/kibana/issues/260081)                     |
| “updating api key … (high)”                                               | [kibana#260050](https://github.com/elastic/kibana/issues/260050)                     |
| “State persistance”                                                       | [kibana#251341](https://github.com/elastic/kibana/issues/251341)                     |
| “Refactor search to use SO cient search”                                  | [kibana#261450](https://github.com/elastic/kibana/issues/261450)                     |
| “Allow attaching dashboards (high)”                                       | [kibana#260048](https://github.com/elastic/kibana/issues/260048) — program: **#158** |
| “Automatic attachment of related rule for authoring a rule on a rule” (ES | QL references `rule.id` / `rule.tags` / `rule.`*)                                    |
| "Will we need to add condition back?"                                   | [kibana#263806](https://github.com/elastic/kibana/issues/263806) — program: **#158** |
| “Display related rules (What does related mean?)” (rule details)          | [kibana#263614](https://github.com/elastic/kibana/issues/263614) — program: **#137** |
| “Display attached dashboards (high)” (rule details)                       | [kibana#263615](https://github.com/elastic/kibana/issues/263615) — program: **#137** |
| "Display notification policies (notification policies that match criteria or are catch all) (high)" (rule details) | [kibana#263625](https://github.com/elastic/kibana/issues/263625) — program: **#137** |
| “Will we need to support no data?”                                        | [kibana#251328](https://github.com/elastic/kibana/issues/251328)                     |
| Execution history filtering                                               | [kibana#251349](https://github.com/elastic/kibana/issues/251349)                     |


Discover-oriented items under “cross project search” may already have children (e.g. profiles / document viewer / Explore in Discover); link those under the umbrella issue rather than re-creating them.

---

## Optional meta hygiene

- Add a single **“M2 execution history — umbrella”** Kibana issue that depends on #251348 / API issue / sorting / URL state / #251349, **or** keep #137 as the program umbrella and attach each leaf as a **sub-issue** of #137 (current approach).

