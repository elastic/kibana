---
name: i18n-review
description: Review code for missing i18n strings and FormattedMessage usage. Use when auditing a file or PR for hard-coded user-facing text, adding i18n to new components, or when the user mentions missing translations, i18n strings, FormattedMessage, or i18n.translate.
---

# i18n Review

## Goal

Find every hard-coded user-facing string and replace it with the correct Kibana i18n pattern. Never leave raw string literals where users will see them.

## The two patterns

**In JSX (React render output)** — use `<FormattedMessage>`:

```tsx
import { FormattedMessage } from '@kbn/i18n-react';

<EuiButton>
  <FormattedMessage
    id="pluginId.area.buttonLabel"
    defaultMessage="Save changes"
  />
</EuiButton>
```

**Outside JSX (non-render code: errors, toasts, aria-labels, placeholders, constants)** — use `i18n.translate`:

```ts
import { i18n } from '@kbn/i18n';

const label = i18n.translate('pluginId.area.saveButtonAriaLabel', {
  defaultMessage: 'Save changes',
});
```

## ID naming convention

Format: `pluginId.area.descriptor`

- `pluginId` — camelCase plugin ID from `kibana.jsonc` (e.g. `securitySolution`, `discover`, `maps`)
- `area` — component or feature name in camelCase (e.g. `ruleEditor`, `dataGrid`)
- `descriptor` — what the string is, in camelCase (e.g. `saveButtonLabel`, `emptyStateTitle`, `errorMessage`)

Examples:
- `securitySolution.ruleEditor.saveButtonLabel`
- `discover.dataGrid.columnHeaderAriaLabel`
- `maps.layerPanel.emptyStateDescription`

IDs must be unique within the plugin. Never reuse an ID for a different string.

## Where strings commonly get missed

Check **all** of these locations in every file:

| Location | Example |
|---|---|
| Button/link text | `<EuiButton>Delete</EuiButton>` |
| `aria-label` props | `aria-label="Close modal"` |
| `title` props on EUI components | `<EuiPanel title="My panel">` |
| `placeholder` on inputs | `<EuiFieldText placeholder="Search...">` |
| `label` / `helpText` on form fields | `<EuiFormRow label="Rule name">` |
| Toast notifications | `toasts.addSuccess('Saved!')` |
| Error messages thrown/returned | `throw new Error('Invalid input')` |
| Tooltip content | `<EuiToolTip content="More info">` |
| Empty state titles/bodies | `<EuiEmptyPrompt title={<h2>No results</h2>}>` |
| `description` props | `<EuiCard description="Does the thing">` |
| Column headers in tables | `{ name: 'Status', field: 'status' }` |
| Confirmation modal text | `<EuiConfirmModal title="Are you sure?">` |
| Badge/tag labels | `<EuiBadge>Active</EuiBadge>` |
| Breadcrumb labels | `{ text: 'Rules', href: '/rules' }` |
| Page/section titles | `<EuiTitle><h1>My Page</h1></EuiTitle>` |

## Strings that do NOT need i18n

- Internal identifiers (IDs, field names, API slugs)
- `data-test-subj` values
- Log messages (server-side, not user-visible)
- Developer-facing error messages in non-UI code
- Type discriminants / enum values

## Interpolation (dynamic values)

Use the `values` prop/option — never concatenate strings:

```tsx
// JSX
<FormattedMessage
  id="pluginId.area.countLabel"
  defaultMessage="Showing {count} results"
  values={{ count: <strong>{resultCount}</strong> }}
/>

// Non-JSX
i18n.translate('pluginId.area.countLabel', {
  defaultMessage: 'Showing {count} results',
  values: { count: resultCount },
})
```

## PR review checklist

- [ ] No raw string literals in JSX render output
- [ ] No hard-coded strings in `aria-label`, `title`, `placeholder`, `label`, `helpText` props
- [ ] No hard-coded strings in toast calls (`addSuccess`, `addDanger`, `addWarning`, `addError`)
- [ ] No hard-coded strings in thrown errors that bubble to the UI
- [ ] No hard-coded strings in table column `name` fields
- [ ] All IDs follow `pluginId.area.descriptor` convention
- [ ] IDs are unique — not copied from another string
- [ ] Dynamic values use `values` interpolation, not string concatenation
- [ ] `FormattedMessage` used in JSX, `i18n.translate` used outside JSX
- [ ] Correct imports: `@kbn/i18n-react` for `FormattedMessage`, `@kbn/i18n` for `i18n`
