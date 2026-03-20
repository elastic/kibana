# Plan: Notification Policy Nullable Clears

**Date**: 2026-03-17
**Author**:
**Status**: Implemented

---

## Problem & Business Outcome

Notification policy updates cannot reliably clear optional fields because omitted or `undefined` values are treated as "no change" by the API and saved object update flow. The goal is to make clearable fields use an explicit nullable contract so policy edits can persist field removal deterministically.

Success means Kibana users can clear `matcher`, `group_by`, and `throttle` on notification policies, and all notification policy API responses expose a stable nullable shape for these fields and `snoozedUntil`.

## Actors

- Kibana users editing notification policies through the UI or internal API consumers.
- Alerting v2 server code reading notification policies from saved objects and transforming them for API or dispatcher use.

## Scope

### In Scope

- Change the notification policy public API update contract so clearable optional fields accept `null`.
- Change the notification policy response contract so `matcher`, `group_by`, `throttle`, and `snoozedUntil` are returned as nullable fields.
- Widen the saved object attribute schema in place to allow nullable storage for those fields without creating a new saved object model version.
- Update the notification policy form payload builder so edit requests send explicit `null` values when users clear nullable fields.
- Refactor notification policy create/update/read transformations so the server owns the mapping between API payloads and saved object attributes.
- Normalize legacy saved objects with missing fields to the new nullable response contract at read time.
- Keep dispatcher internals working by normalizing nullable storage values into the dispatcher's existing runtime expectations.
- Add and update unit tests for the new API, storage, and dispatcher behavior.

### Out of Scope

- Adding a new saved object model version or migration.
- Preserving backward compatibility for old response shapes or update semantics.
- Making `description` or `destinations` nullable.
- Changing notification policy search mappings or unrelated form code outside what is needed for the new server contract.

---

## Open Questions & Risks

None identified.

---

## Reference: Related Files

| File | Change type | Notes |
|------|-------------|-------|
| `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts` | Modify | Make clearable update fields nullable |
| `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_response.ts` | Modify | Return explicit nullable fields in API responses |
| `x-pack/platform/plugins/shared/alerting_v2/server/saved_objects/schemas/notification_policy_saved_object_attributes/v1.ts` | Modify | Allow nullable storage fields without a model version |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts` | Modify | Replace spread-merging with explicit transform helpers |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/utils.ts` | Modify | Add notification policy create/update/read transform helpers |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/types.ts` | Modify | Align local types with the nullable API contract |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/steps/fetch_policies_step.ts` | Modify | Normalize nullable storage values for dispatcher runtime use |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.test.ts` | Modify | Cover nullable update and response behavior |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/steps/fetch_policies_step.test.ts` | Modify | Cover normalization of nullable or missing saved object fields |
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.ts` | Modify | Send explicit nullable clears on update payloads |
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.test.ts` | Create | Cover create/update payload transformation rules |

---

## Todo

> Generated: 2026-03-17
> Status: In progress

### Phase 1: Public and storage schema ✓

- [x] **Update nullable notification policy update inputs** — `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts`
  Make `matcher`, `group_by`, and `throttle` accept `null` in update payloads while keeping create semantics unchanged.

- [x] **Lock nullable notification policy responses** — `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_response.ts`
  Change the response contract so `matcher`, `group_by`, `throttle`, and `snoozedUntil` are explicit nullable fields.

- [x] **Widen saved object attribute schema** — `x-pack/platform/plugins/shared/alerting_v2/server/saved_objects/schemas/notification_policy_saved_object_attributes/v1.ts`
  Allow the clearable saved object fields to store `null` without introducing a model version.

### Phase 2: Server transforms and update flow ✓

- [x] **Add notification policy transform helpers** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/utils.ts`
  Add explicit create, update, and response mapping helpers that preserve domain invariants and normalize old missing values to `null` in API responses.

- [x] **Refactor notification policy client to use helpers** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts`, `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/types.ts`
  Replace spread-merging in create/get/list/update flows with helper-driven mapping so `undefined` means "keep existing" and `null` means "clear".

- [x] **Normalize dispatcher policy reads** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/steps/fetch_policies_step.ts`
  Convert nullable saved object fields into the dispatcher's existing runtime shape (`undefined` or defaults where appropriate).

- [x] **Update notification policy form payloads** — `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.ts`
  Keep create payload omission semantics, but make edit payloads send explicit `null` for cleared nullable fields and preserve required fields.

### Phase 3: Tests and verification ✓

- [x] **Add nullable notification policy client tests** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.test.ts`
  Add tests for clearing matcher, group_by, and throttle with `null`, and for legacy missing fields being returned as `null`.

- [x] **Add dispatcher normalization tests** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/steps/fetch_policies_step.test.ts`
  Verify fetch policies step converts nullable or missing storage values into the dispatcher's expected shape.

- [x] **Add notification policy form utility tests** — `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.test.ts`
  Cover create payload omission semantics and update payload nullable clear semantics.

- [x] **Run validation commands** — `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts`, `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts`, `x-pack/platform/plugins/shared/alerting_v2/server/lib/dispatcher/steps/fetch_policies_step.ts`
  Run targeted Jest coverage, scoped type checks if needed, and `node scripts/check_changes.ts`, then mark the plan complete.
