# Plan: Bulk Actions for Notification Policies

**Date**: 2026-03-19
**Author**:
**Status**: Complete

---

## Problem & Business Outcome

Users managing many notification policies must currently act on them one at a time (enable, disable, delete, snooze, unsnooze). This is tedious when managing tens or hundreds of policies.

**Success**: Users can select multiple notification policies from the listing page and apply bulk actions (enable, disable, delete, snooze, unsnooze) in a single operation, significantly reducing the time spent on routine admin tasks.

## Actors

All users with write access to notification policies.

## Scope

### In Scope
- "Showing X-Y of Z notification policies" count label above the table
- Row selection (individual + select all on current page) via EuiBasicTable `selection` prop
- Bulk actions toolbar: "XX Selected" dropdown (enable, disable, delete, snooze, unsnooze) + "Clear Selection"
- Disable individual row actions when selection is active
- Lock selection while a bulk request is in progress
- Bulk delete confirmation modal
- Bulk snooze modal (reusing `NotificationPolicySnoozeForm`)
- Client-side API method + React Query hook for the bulk endpoint
- Server-side: add `delete` action to the bulk action schema and handler

### Out of Scope
- Select across pages (only current page items can be selected)
- Bulk clone or bulk edit of policy configuration

---

## Implementation Details

### Phase 1: Server-side — Add `delete` to bulk action schema and handler

The current bulk endpoint (`POST /_bulk`) supports `enable`, `disable`, `snooze`, `unsnooze` but **not `delete`**. The handler uses `bulkUpdate` on saved objects, but delete requires `bulkDelete`. We need to extend both schema and handler.

#### 1a. Extend the Zod schema

**File**: `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts`

Add a `bulkDeleteActionSchema` and include it in the discriminated union:

```typescript
const bulkDeleteActionSchema = z.object({
  id: z.string(),
  action: z.literal('delete'),
});

export const notificationPolicyBulkActionSchema = z.discriminatedUnion('action', [
  bulkEnableActionSchema,
  bulkDisableActionSchema,
  bulkSnoozeActionSchema,
  bulkUnsnoozeActionSchema,
  bulkDeleteActionSchema,  // NEW
]);
```

#### 1b. Update the server-side handler

**File**: `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts`

Separate delete actions from update actions in `bulkActionNotificationPolicies`:

```typescript
public async bulkActionNotificationPolicies({
  actions,
}: BulkActionNotificationPoliciesParams): Promise<BulkActionNotificationPoliciesResponse> {
  const userProfile = await this.getUserProfile();
  const now = new Date().toISOString();

  // Separate deletes from updates
  const deleteActions = actions.filter((a) => a.action === 'delete');
  const updateActions = actions.filter((a) => a.action !== 'delete');

  const errors: Array<{ id: string; message: string }> = [];
  let processed = 0;

  // Handle updates
  if (updateActions.length > 0) {
    const objects = updateActions.map((action) => ({
      id: action.id,
      attrs: {
        ...resolveActionAttrs(action),
        updatedBy: userProfile.uid,
        updatedByUsername: userProfile.username,
        updatedAt: now,
      },
    }));
    const updateResults = await this.notificationPolicySavedObjectService.bulkUpdate({ objects });
    for (const result of updateResults) {
      if ('error' in result) {
        errors.push({ id: result.id, message: result.error.message });
      } else {
        processed++;
      }
    }
  }

  // Handle deletes
  if (deleteActions.length > 0) {
    const deleteResults = await this.notificationPolicySavedObjectService.bulkDelete({
      ids: deleteActions.map((a) => a.id),
    });
    for (const result of deleteResults) {
      if ('error' in result) {
        errors.push({ id: result.id, message: result.error.message });
      } else {
        processed++;
      }
    }
  }

  return { processed, total: actions.length, errors };
}
```

> **Note**: Verify that `notificationPolicySavedObjectService.bulkDelete` exists. If not, it needs to be added following the pattern of `bulkUpdate`. Read `notification_policy_saved_object_service.ts` to confirm.

---

### Phase 2: Client-side API method and hook

#### 2a. Add bulk action method to the API service

**File**: `x-pack/platform/plugins/shared/alerting_v2/public/services/notification_policies_api.ts`

Add a new import for `BulkActionNotificationPoliciesBody` from `@kbn/alerting-v2-schemas` and add:

```typescript
import type {
  BulkActionNotificationPoliciesBody,
  // ... existing imports
} from '@kbn/alerting-v2-schemas';

// Response type (define locally or import from schemas)
interface BulkActionNotificationPoliciesResponse {
  processed: number;
  total: number;
  errors: Array<{ id: string; message: string }>;
}

public async bulkActionNotificationPolicies(body: BulkActionNotificationPoliciesBody) {
  return this.http.post<BulkActionNotificationPoliciesResponse>(
    `${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/_bulk`,
    { body: JSON.stringify(body) }
  );
}
```

#### 2b. Add query key

**File**: `x-pack/platform/plugins/shared/alerting_v2/public/hooks/query_key_factory.ts`

```typescript
export const notificationPolicyKeys = {
  // ... existing keys
  bulkAction: () => [...notificationPolicyKeys.all, 'bulkAction'] as const,
};
```

#### 2c. Create the `useBulkActionNotificationPolicies` hook

**New file**: `x-pack/platform/plugins/shared/alerting_v2/public/hooks/use_bulk_action_notification_policies.ts`

Follow the pattern of existing mutation hooks (`useDeleteNotificationPolicy`, `useEnableNotificationPolicy`):

```typescript
import type { BulkActionNotificationPoliciesBody } from '@kbn/alerting-v2-schemas';
import { useQueryClient, useMutation } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
// ... same DI pattern as other hooks

export const useBulkActionNotificationPolicies = () => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);
  const queryClient = useQueryClient();
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation({
    mutationKey: notificationPolicyKeys.bulkAction(),
    mutationFn: (body: BulkActionNotificationPoliciesBody) =>
      notificationPoliciesApi.bulkActionNotificationPolicies(body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationPolicyKeys.lists() });

      const actionType = variables.actions[0]?.action;
      const count = data.processed;

      if (data.errors.length > 0) {
        toasts.addWarning({
          title: i18n.translate('...partialSuccess', {
            defaultMessage: '{processed} of {total} notification policies updated. {errorCount} failed.',
            values: { processed: data.processed, total: data.total, errorCount: data.errors.length },
          }),
        });
      } else {
        // Action-specific success messages
        const messages: Record<string, string> = {
          enable: `${count} notification policies enabled`,
          disable: `${count} notification policies disabled`,
          delete: `${count} notification policies deleted`,
          snooze: `${count} notification policies snoozed`,
          unsnooze: `Snooze cancelled for ${count} notification policies`,
        };
        toasts.addSuccess(messages[actionType] ?? `${count} notification policies updated`);
      }
    },
    onError: () => {
      toasts.addError(/* ... */);
    },
  });
};
```

---

### Phase 3: UI Components

#### 3a. Bulk delete confirmation modal

**New file**: `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_delete_confirmation_modal.tsx`

Reuse the pattern from `DeleteNotificationPolicyConfirmModal` but for bulk:

```typescript
interface BulkDeleteConfirmationModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}
```

- Title: "Delete {count} notification policies?"
- Body: "Are you sure you want to delete {count} notification policies? This action cannot be undone."
- Buttons: Cancel, Confirm (danger)

#### 3b. Bulk snooze modal

**New file**: `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_snooze_modal.tsx`

A modal wrapping the existing `NotificationPolicySnoozeForm` component:

```typescript
interface BulkSnoozeModalProps {
  count: number;
  onApplySnooze: (snoozedUntil: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

- Uses `EuiModal` with title: "Snooze {count} notification policies"
- Embeds `NotificationPolicySnoozeForm` with `isSnoozed={false}` (no cancel snooze in bulk context)
- When user selects a duration and clicks Apply, calls `onApplySnooze(snoozedUntil)`

#### 3c. Bulk actions toolbar

**New file**: `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/notification_policies_bulk_actions.tsx`

Renders when `selectedPolicies.length > 0`. Contains:

```typescript
interface NotificationPoliciesBulkActionsProps {
  selectedPolicies: NotificationPolicyResponse[];
  onClearSelection: () => void;
  onBulkAction: (action: 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze', snoozedUntil?: string) => void;
  isLoading: boolean;
}
```

Layout: `EuiFlexGroup` with:
1. **"XX Selected"** — `EuiPopover` triggered by `EuiButtonEmpty` showing "XX Selected" with a caret-down icon. Popover contains an `EuiContextMenu` with:
   - Enable
   - Disable
   - Snooze (opens snooze modal)
   - Unsnooze
   - Delete (opens delete confirmation modal)
2. **"Clear Selection"** — `EuiButtonEmpty` that calls `onClearSelection`

This component also manages the local state for which modal is open (delete confirmation or snooze).

---

### Phase 4: Integration into the listing page

**File**: `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/list_notification_policies_page.tsx`

#### 4a. Add "Showing X-Y of Z" count

Insert above the `EuiBasicTable`, after the search bar. Following the pattern provided:

```tsx
<FormattedMessage
  id="xpack.alertingV2.notificationPoliciesList.showingLabel"
  defaultMessage="Showing {rangeBold} of {totalBold}"
  values={{
    rangeBold: (
      <strong>
        {Math.min(page * perPage + 1, total)}-{Math.min((page + 1) * perPage, total)}
      </strong>
    ),
    totalBold: (
      <strong>
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.showingLabelTotal"
          defaultMessage="{total} {total, plural, one {notification policy} other {notification policies}}"
          values={{ total }}
        />
      </strong>
    ),
  }}
/>
```

Note: `page` is 0-indexed in the current state, so the range calculation adjusts accordingly.

#### 4b. Add selection state

```typescript
const [selectedPolicies, setSelectedPolicies] = useState<NotificationPolicyResponse[]>([]);

const selection: EuiTableSelectionType<NotificationPolicyResponse> = {
  onSelectionChange: setSelectedPolicies,
  selected: selectedPolicies,
  selectable: () => !isBulkActionInProgress,  // Lock selection during bulk action
};
```

Pass `selection` to `EuiBasicTable`:
```tsx
<EuiBasicTable
  selection={selection}
  itemId="id"
  // ... existing props
/>
```

**Important**: `itemId="id"` is required for EuiBasicTable to track selection by policy ID.

#### 4c. Clear selection on filter/pagination changes

In `handleSearchChange`, `handleEnabledChange`, and `onTableChange`, add:
```typescript
setSelectedPolicies([]);
```

#### 4d. Disable individual row actions when selection is active

Pass a prop to `NotificationPolicyActionsCell` to disable it when `selectedPolicies.length > 0`:

In the actions column render:
```tsx
render: (policy: NotificationPolicyResponse) => (
  <NotificationPolicyActionsCell
    // ... existing props
    isDisabled={selectedPolicies.length > 0}
  />
)
```

Update `NotificationPolicyActionsCell` to accept and respect an `isDisabled` prop — disable all action buttons when true.

#### 4e. Wire up bulk actions toolbar

Add the `useBulkActionNotificationPolicies` hook and render the toolbar:

```typescript
const { mutate: bulkAction, isLoading: isBulkActionInProgress } = useBulkActionNotificationPolicies();

const handleBulkAction = (action: string, snoozedUntil?: string) => {
  const actions = selectedPolicies.map((policy) => ({
    id: policy.id,
    action,
    ...(action === 'snooze' && snoozedUntil ? { snoozedUntil } : {}),
  }));
  bulkAction(
    { actions },
    { onSuccess: () => setSelectedPolicies([]) }
  );
};
```

Layout between search bar and table:

```tsx
<EuiFlexGroup alignItems="center" gutterSize="m">
  <EuiFlexItem grow={false}>
    {/* Showing X-Y of Z label */}
  </EuiFlexItem>
  {selectedPolicies.length > 0 && (
    <>
      <EuiFlexItem grow={false}>
        <NotificationPoliciesBulkActions
          selectedPolicies={selectedPolicies}
          onClearSelection={() => setSelectedPolicies([])}
          onBulkAction={handleBulkAction}
          isLoading={isBulkActionInProgress}
        />
      </EuiFlexItem>
    </>
  )}
</EuiFlexGroup>
```

#### 4f. Also disable individual state/snooze column controls when selection is active

In the `enabled` and `snoozedUntil` column renders, disable the `NotificationPolicyStateBadge` and `NotificationPolicySnoozePopover` when `selectedPolicies.length > 0`.

---

## Open Questions & Risks

- [x] **Question**: Does `notificationPolicySavedObjectService` already have a `bulkDelete` method? — **Impact**: If not, it must be added to the saved object service before the server handler can support bulk delete. Read `notification_policy_saved_object_service.ts` to confirm. - **Decision**: it does not have the bulkDelete, add it.
- [x] **Question**: Should bulk action success clear the selection immediately or wait for the refetch? — **Impact**: UX smoothness. Recommend clearing on success callback (optimistic) since `invalidateQueries` will refetch the list. -- **Decision**: clear on success callback
- [x] **Question**: Should we show individual error details when some actions in a bulk operation fail? — **Impact**: If a partial failure occurs (e.g., 18/20 succeed), the user needs to understand which ones failed. The current toast approach with a count may be sufficient for v1. **Decision**: show details of failures with count 18/20 succeeded.

---

## Reference: Related Files

| File | Change type | Notes |
|------|-------------|-------|
| `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts` | Modify | Add `bulkDeleteActionSchema` to discriminated union |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts` | Modify | Handle delete actions separately in `bulkActionNotificationPolicies` |
| `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_saved_object_service.ts` | Possibly modify | May need `bulkDelete` method |
| `x-pack/platform/plugins/shared/alerting_v2/public/services/notification_policies_api.ts` | Modify | Add `bulkActionNotificationPolicies` method |
| `x-pack/platform/plugins/shared/alerting_v2/public/hooks/query_key_factory.ts` | Modify | Add `bulkAction` key |
| `x-pack/platform/plugins/shared/alerting_v2/public/hooks/use_bulk_action_notification_policies.ts` | Create | New mutation hook for bulk actions |
| `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/list_notification_policies_page.tsx` | Modify | Add selection, count label, bulk actions toolbar, disable row actions |
| `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/notification_policies_bulk_actions.tsx` | Create | Bulk actions toolbar with dropdown and modals |
| `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_delete_confirmation_modal.tsx` | Create | Bulk delete confirmation modal |
| `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_snooze_modal.tsx` | Create | Bulk snooze modal wrapping `NotificationPolicySnoozeForm` |
| `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/notification_policy_actions_cell.tsx` | Modify | Add `isDisabled` prop |
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/notification_policy_state_badge.tsx` | Possibly modify | May need `isDisabled` prop |
| `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/notification_policy_snooze_popover.tsx` | Possibly modify | May need `isDisabled` prop |

---

## Todo

> Generated: 2026-03-19
> Status: Not started — do not begin implementation until explicitly instructed.

<!-- Tasks are organised into phases. Complete each phase before starting the next.
     Each task references the specific file(s) it touches and what needs to happen.
     Check off tasks as they are completed during implementation. -->

### Phase 1: Schema & Server-Side Data Layer ✓

- [x] **Add `bulkDeleteActionSchema` to Zod discriminated union** — `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts`
  Add `const bulkDeleteActionSchema = z.object({ id: z.string(), action: z.literal('delete') })` and include it in the `notificationPolicyBulkActionSchema` discriminated union array alongside the existing enable/disable/snooze/unsnooze schemas.

- [x] **Add `bulkDelete` to `NotificationPolicySavedObjectServiceContract` and implementation** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/services/notification_policy_saved_object_service/notification_policy_saved_object_service.ts`
  1. Define return type: `export type NotificationPolicySavedObjectBulkDeleteItem = { id: string } | { id: string; error: SavedObjectError };` (next to existing `NotificationPolicySavedObjectBulkUpdateItem` at line 34).
  2. Add `bulkDelete(params: { ids: string[] }): Promise<NotificationPolicySavedObjectBulkDeleteItem[]>` to the `NotificationPolicySavedObjectServiceContract` interface (after `delete` at line 63).
  3. Implement `bulkDelete` in the class following the `bulkUpdate` pattern (line 150): early return for empty array, call `this.client.bulkDelete(ids.map(id => ({ type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id })))`, map `result.statuses` to success/error items.

- [x] **Handle delete actions in `bulkActionNotificationPolicies`** — `x-pack/platform/plugins/shared/alerting_v2/server/lib/notification_policy_client/notification_policy_client.ts`
  In the `bulkActionNotificationPolicies` method (line 299), split `actions` into `deleteActions` (action === 'delete') and `updateActions` (action !== 'delete'). Process updates with existing `bulkUpdate` logic, process deletes with new `this.notificationPolicySavedObjectService.bulkDelete({ ids: deleteActions.map(a => a.id) })`. Collect errors and processed counts from both. Note: `resolveActionAttrs` (line 51) does not need a delete case since delete actions skip the update path entirely.

### Phase 2: Client-Side API & Hook ✓

- [x] **Add `bulkActionNotificationPolicies` method to API service** — `x-pack/platform/plugins/shared/alerting_v2/public/services/notification_policies_api.ts`
  1. Add import: `import type { BulkActionNotificationPoliciesBody } from '@kbn/alerting-v2-schemas';`
  2. Define response interface locally in the file: `export interface BulkActionNotificationPoliciesResponse { processed: number; total: number; errors: Array<{ id: string; message: string }>; }`
  3. Add method: `public async bulkActionNotificationPolicies(body: BulkActionNotificationPoliciesBody) { return this.http.post<BulkActionNotificationPoliciesResponse>(\`${INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/_bulk\`, { body: JSON.stringify(body) }); }`

- [x] **Add `bulkAction` query key** — `x-pack/platform/plugins/shared/alerting_v2/public/hooks/query_key_factory.ts`
  Add `bulkAction: () => [...notificationPolicyKeys.all, 'bulkAction'] as const` to the `notificationPolicyKeys` object (after `unsnooze` at line 35).

- [x] **Create `useBulkActionNotificationPolicies` hook** — `x-pack/platform/plugins/shared/alerting_v2/public/hooks/use_bulk_action_notification_policies.ts` (new file)
  Follow the exact pattern of `use_delete_notification_policy.ts`: use `useMutation` from `@kbn/react-query`, inject `NotificationPoliciesApi` via `useService`, get `toasts` from `useService(CoreStart('notifications'))`, get `queryClient` via `useQueryClient()`. Mutation type: `useMutation<BulkActionNotificationPoliciesResponse, Error, BulkActionNotificationPoliciesBody>`. On success: invalidate `notificationPolicyKeys.lists()` with `exact: false`. Toast logic: if `data.errors.length > 0`, show warning with `"{processed} of {total} notification policies updated. {errorCount} failed."` using `i18n.translate`; otherwise show action-specific success message using `i18n.translate` (e.g., "X notification policies enabled"). On error: show `toasts.addError(error, { title })`.

### Phase 3: UI Components ✓

- [x] **Create bulk delete confirmation modal** — `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_delete_confirmation_modal.tsx` (new file)
  Follow the pattern of `delete_confirmation_modal.tsx`. Props: `{ count: number; onCancel: () => void; onConfirm: () => void; isLoading?: boolean }`. Use `EuiConfirmModal` with `buttonColor="danger"`. Title: `i18n.translate` "Delete {count} notification policies?". Body: `FormattedMessage` "Are you sure you want to delete {count} notification policies? This action cannot be undone." with count in `<strong>`. Use `useGeneratedHtmlId()` for the modal ID.

- [x] **Create bulk snooze modal** — `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/bulk_snooze_modal.tsx` (new file)
  Props: `{ count: number; onApplySnooze: (snoozedUntil: string) => void; onCancel: () => void; isLoading?: boolean }`. Use `EuiModal` + `EuiModalHeader` + `EuiModalBody`. Title: `FormattedMessage` "Snooze {count} notification policies". Body: embed `NotificationPolicySnoozeForm` from `../../components/notification_policy/notification_policy_snooze_form` with `isSnoozed={false}`, `onApplySnooze` passed through, and `onCancelSnooze` as a no-op (cancel snooze not relevant in bulk context).

- [x] **Create bulk actions toolbar component** — `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/notification_policies_bulk_actions.tsx` (new file)
  Props: `{ selectedPolicies: NotificationPolicyResponse[]; onClearSelection: () => void; onBulkAction: (action: 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze', snoozedUntil?: string) => void; isLoading: boolean }`. Layout: `EuiFlexGroup` with two items: (1) `EuiPopover` triggered by `EuiButtonEmpty` showing "{count} Selected" with `iconType="arrowDown"` and `iconSide="right"` — popover contains `EuiContextMenu` with single panel listing Enable, Disable, Snooze, Unsnooze, Delete (delete uses `color: 'danger'`); (2) `EuiButtonEmpty` "Clear selection" calling `onClearSelection`. Manage local state for active modal: `useState<'delete' | 'snooze' | null>(null)`. Render `BulkDeleteConfirmationModal` when `activeModal === 'delete'` and `BulkSnoozeModal` when `activeModal === 'snooze'`. Close popover and set active modal on menu item click. On modal confirm/apply, call `onBulkAction` and reset `activeModal` to null.

### Phase 4: Integration into Listing Page ✓

- [x] **Add `isDisabled` prop to `NotificationPolicyActionsCell`** — `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/components/notification_policy_actions_cell.tsx`
  Add `isDisabled?: boolean` to `NotificationPolicyActionsCellProps`. When `isDisabled` is true, pass `isDisabled={true}` to all three `EuiButtonIcon` components (edit, delete, more) to grey them out and prevent clicks.

- [x] **Add `isDisabled` prop to `NotificationPolicyStateBadge`** — `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/notification_policy_state_badge.tsx`
  Add `isDisabled?: boolean` to `NotificationPolicyStateBadgeProps`. When `isDisabled` is true, render the `EuiBadge` without the popover click handler (don't open the enable/disable popover).

- [x] **Add `isDisabled` prop to `NotificationPolicySnoozePopover`** — `x-pack/platform/plugins/shared/alerting_v2/public/components/notification_policy/notification_policy_snooze_popover.tsx`
  Add `isDisabled?: boolean` to `NotificationPolicySnoozePopoverProps`. When `isDisabled` is true, pass `isDisabled={true}` to the `EuiButtonIcon` (bell) or `EuiButton` (snoozed state) to prevent opening the popover.

- [x] **Wire up selection, count label, bulk actions, and disable row controls in the listing page** — `x-pack/platform/plugins/shared/alerting_v2/public/pages/list_notification_policies_page/list_notification_policies_page.tsx`
  This is the main integration task. Changes:
  1. **Imports**: Add `EuiTableSelectionType` from `@elastic/eui`, `useBulkActionNotificationPolicies` hook, `NotificationPoliciesBulkActions` component.
  2. **State**: Add `const [selectedPolicies, setSelectedPolicies] = useState<NotificationPolicyResponse[]>([])`.
  3. **Hook**: Add `const { mutate: bulkAction, isLoading: isBulkActionInProgress } = useBulkActionNotificationPolicies()`.
  4. **Selection object**: Create `const selection: EuiTableSelectionType<NotificationPolicyResponse> = { onSelectionChange: setSelectedPolicies, selected: selectedPolicies, selectable: () => !isBulkActionInProgress }`.
  5. **Clear selection on filter/pagination changes**: Add `setSelectedPolicies([])` to `handleSearchChange`, `handleEnabledChange`, and `onTableChange`.
  6. **handleBulkAction callback**: Create function that maps `selectedPolicies` to bulk action request body, calls `bulkAction(body, { onSuccess: () => setSelectedPolicies([]) })`.
  7. **"Showing X-Y of Z" label**: Insert `EuiFlexGroup` between the search bar `EuiFlexItem` and the `EuiBasicTable`, containing the `FormattedMessage` with range/total pattern from the plan (adjust for 0-indexed page). Only render when `total > 0`.
  8. **Bulk actions toolbar**: Conditionally render `NotificationPoliciesBulkActions` next to the count label when `selectedPolicies.length > 0`.
  9. **EuiBasicTable props**: Add `selection={selection}` and `itemId="id"` to the table.
  10. **Disable row controls**: Pass `isDisabled={selectedPolicies.length > 0}` to `NotificationPolicyActionsCell` in the actions column, to `NotificationPolicyStateBadge` in the enabled column, and to `NotificationPolicySnoozePopover` in the snoozedUntil column.
