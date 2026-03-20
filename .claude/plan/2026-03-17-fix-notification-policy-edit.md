# Plan: Fix Notification Policy Edit — Cleared Fields Not Persisted

**Date**: 2026-03-17
**Author**:
**Status**: Implemented

---

## Problem & Business Outcome

When editing a Notification Policy and clearing optional fields (matcher, group_by, throttle), the changes are silently lost. The form sends `undefined` for empty optional fields, and because the PUT API performs a partial merge (`{ ...existingPolicy, ...newData }`), `undefined` keys in the payload are stripped by `JSON.stringify` and the server preserves the old values.

**Success**: Users can clear matcher, group_by, and throttle fields when editing a notification policy, and those changes are persisted correctly.

## Actors

All Kibana users who can access notification policies.

## Scope

### In Scope
- Fix the frontend `toUpdatePayload` function to always send explicit empty values for clearable fields (`matcher: ''`, `group_by: []`, `throttle: null`)
- Update the API update schema to accept `throttle: null` for clearing throttle
- Update the server client to convert `throttle: null` to `undefined` before saving to the saved object
- Add unit tests for `form_utils.ts` covering the create and update payload transformations

### Out of Scope
- Other form fields beyond matcher, group_by, and throttle

---

## Root Cause Analysis

### The bug in `toCreatePayload` (reused by `toUpdatePayload`)

In `form_utils.ts:28-41`, `toCreatePayload` conditionally omits optional fields when empty:

```typescript
...(state.matcher ? { matcher: state.matcher } : {}),           // omits when ""
...(state.groupBy.length > 0 ? { group_by: state.groupBy } : {}), // omits when []
```

`toUpdatePayload` delegated to `toCreatePayload`, inheriting the omission behavior.

### Why it matters for updates but not creates

- **Create**: Omitting optional fields is fine — the server creates with no matcher/group_by.
- **Update**: The server merges `{ ...existingPolicy, ...parsedData }`. When a key is missing from `parsedData`, the spread keeps the existing value, so clearing a field has no effect.

### Note on `destinations`

The `destinations` field is **already always sent** by `toCreatePayload`, so it does not have this bug. No change needed.

---

## Implementation

### 1. Updated `toUpdatePayload` in `form_utils.ts`

Stopped delegating to `toCreatePayload`. Always includes all fields explicitly, including `throttle: null` when frequency is immediate.

### 2. Updated `updateNotificationPolicyDataSchema` in `notification_policy_data_schema.ts`

Made `throttle` accept `null` via `.nullable()` so the API can receive explicit clearing.

### 3. Updated `notification_policy_client.ts`

Handles `throttle: null` from the API by converting it to `undefined` before saving to the saved object (SO schema uses `maybe()` which is `T | undefined`).

### 4. Added `form_utils.test.ts`

8 tests covering `toFormState`, `toCreatePayload`, and `toUpdatePayload`.

---

## Open Questions & Risks

None identified.

---

## Reference: Related Files

| File | Change type | Notes |
|------|-------------|-------|
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.ts` | Modify | Fix `toUpdatePayload` to always include clearable fields |
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/form/form_utils.test.ts` | Create | Unit tests for all three utility functions |
| `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts` | Modify | Allow `throttle: null` in update schema |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts` | Modify | Handle `throttle: null` → `undefined` conversion |
