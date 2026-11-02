# EUI data tables: `EuiBasicTable` and `EuiInMemoryTable`

**Applies to:** `EuiBasicTable`, `EuiInMemoryTable`

Tables need a **caption** exposed to assistive technology so users understand what the grid represents (different from the page `<title>`). EUI exposes this as **`tableCaption`**.

## Canonical usage

- Pass **exactly one** **`tableCaption`** per table instance.
- Caption text **describes the dataset or task** — “User accounts in this space”, not “Table”.
- If visible nearby text already names the table, you may align caption wording with it; otherwise use **`i18n.translate`** for new strings (see *Localization (i18n)* in **`../shared_principles.md`**).
- If **`tableCaption`** is supplied through **`{...tableProps}`**, fix it at the **source** or merge explicitly at the callsite — never duplicate conflicting captions.

## Examples

```tsx
<EuiBasicTable
  tableCaption={i18n.translate('usersList.tableCaption', {
    defaultMessage: 'User accounts list',
  })}
  items={items}
  columns={columns}
/>
```

## Common mistakes

```tsx
// WRONG — no caption
<EuiBasicTable items={items} columns={columns} />

// WRONG — generic caption
<EuiBasicTable tableCaption="Table" items={items} columns={columns} />
```
