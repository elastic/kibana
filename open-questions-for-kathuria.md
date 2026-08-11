# Open questions for Kathuria — please comment

The plan is at: `~/.cursor/plans/SIEM migration skills  Pattern C-8b328697.plan.md`
(Automatic Migration tools #18760 + skills #18761)

Please leave your answers inline below each question.

---

## Q1. Platform connector tool naming  [ANSWERED]

Your answer: **Option A** — Keep `platform.core.list_ai_connectors` (more precise, already shipped). Update the ticket text. Skills reference this id.

> Folded into the plan: skills reference `platform.core.list_ai_connectors`; the platform tool stays globally registered by the `agent_builder` plugin. No rename.

---

## Q2. `install_migration_rules` tool contract  [DECIDED — deferred follow-up recorded]

Your answer: **For now, install returns the count + migrated rule titles (from `get_migration_rules`). Promoting `security.find_rules` from inline → registry tool (to enable live prebuilt-rule verification with a checkmark) is agreed but deferred to a follow-up.**

> Folded into the plan: install tool returns `{ installed: number }`; install skill reports count + migrated rule titles; routes the user to `find-security-rules` for live verification until the `find_rules` promotion lands.

### Deferred follow-up (to answer later)
- [ ] **FU-1** — Promote `security.find_rules` from an inline tool ([find_rules_tool.ts:232](x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/find_rules/find_rules_tool.ts)) to a **registry** tool so the install skill (and others) can reference it. Enables: install → `get_migration_rules` (`elastic_rule.prebuilt_rule_id`) → `find_rules` (`ruleId`) → live rule name + enabled "checkmark". Touches: find-security-rules skill, allow-list, inline→registry migration, and the `find-security-rules` content (which currently mandates `discover_rule_tags` before every `find_rules` call — that coupling must be re-examined when find_rules becomes registry-shared). **Tracked here, not in this iteration.**

Your answer: (leave for later)

---

## Q3. Name-collision last-resort policy  [ANSWERED]

Your answer: **Disambiguate by vendor name first** (two same-named migrations from different vendors disambiguate via vendor); **then show the full id as last resort** (Option C); **name is never skipped**.

> Folded into the plan: disambiguation hierarchy is now (1) name, (2) vendor, (3) status/created_at/counts, (4) full migration id as last-resort tiebreaker. Name is always shown. The "never surface migration ids" rule is relaxed to: full id shown only as the last-resort tiebreaker.

---

## Q4. Serverless support  [ANSWERED]

Your answer: **Option A** — Supported on serverless; add a serverless test.

> Folded into the plan: availability handler must NOT reject serverless; add a serverless test asserting this.

---

## Q5. Migration-type disambiguation block  [ANSWERED]

Your answer: **Option A** — Keep the block. Define the axis as rule-migration vs dashboard-migration; when the user means dashboards, the agent explains **no dashboard-migration agent tools exist yet but support is coming soon to Agent Builder** and routes them to the UI. Ask only when genuinely ambiguous.

> Folded into the plan: `TYPE_DISAMBIGUATION_BLOCK` includes the "coming soon to Agent Builder" language; `boundary.spec.ts` type-ambiguous test expects the clarifying question + the coming-soon explanation.

---

## Q6. Anything else you want adjusted in the plan?

(Comments on skill naming, structure, scope, sequencing, etc.)

Your answer:

---

## Q7. Serverless product-feature (PLI) gating in the availability handler  [ANSWERED — Option A]

Q4 decided Automatic Migration is supported on serverless. But the availability handler currently gates only on **enterprise license + space** ([register_siem_migration_tools.ts:22-44](x-pack/solutions/security/plugins/security_solution/server/agent_builder/tools/siem_migrations/register_siem_migration_tools.ts)) — it does NOT check the SIEM Migrations **product feature** (`siemMigrations` PLI, which grants `SIEM_MIGRATIONS_API_ACTION_ALL`). So on a serverless security space where the PLI is off (lower tier / feature not entitled), the tools advertise as **available** but every call 404s at the endpoint (via `registerApiAccessControl`, which returns 404 — not 403 — when the PLI-granted action is not registered). That is "advertised but broken" — inconsistent with the rest of SIEM Migrations (endpoints 404 + UI hidden when PLI-off).

This applies to the existing 3 PoC tools too, not just the 9 new ones.

- [x] **Option A — Gate now (SELECTED).** Add a product-feature gate to the availability handler via `productFeaturesService.isEnabled('siemMigrations')` ([product_features_service.ts:132](x-pack/solutions/security/plugins/security_solution/server/lib/product_features_service/product_features_service.ts)): tools return `unavailable` when the SIEM Migrations PLI is not granted in the current space (hidden, not advertised-then-404). Matches existing SIEM Migrations behavior (endpoints 404 via `registerApiAccessControl` + UI hidden when PLI-off). The PLI is license/PLI-based (not per-user), so `cacheMode: 'space'` stays valid. Improves the 3 existing tools too.
- [ ] **Option B** — Defer. Keep the known-gap note in the plan; accept "advertised-then-403" on PLI-off serverless tiers for this experimental iteration (the feature is flag-gated anyway). Add a follow-up to add PLI gating later.
- [ ] **Other** — your call:

Your answer: **Option A — Gate now** (see the checked Option A above). Folded into the plan: availability handler gates on license + space + `siemMigrations` PLI; `productFeaturesService` is threaded through `registerTools` → `registerSiemMigrationTools` → `createSiemMigrationAvailability`; `isEnabled` throw treated as `unavailable`; PLI-off → `unavailable` test added. Todos #4/#5 unblocked.

