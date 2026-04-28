---
name: accessibility
description: >
  Use when writing, refactoring, or reviewing Kibana JSX that uses EUI components to apply
  the canonical accessible pattern (component choice, props, accessible names, ARIA wiring,
  keyboard/focus, html ids). Components: EuiModal, EuiFlyout, EuiFlyoutResizable,
  EuiConfirmModal, EuiPopover, EuiBasicTable, EuiInMemoryTable, EuiCallOut, EuiIcon,
  EuiIconTip, EuiToolTip, EuiButton, EuiButtonIcon, EuiLink, EuiFormRow, EuiFieldText,
  EuiFieldNumber, EuiFilePicker, EuiComboBox, EuiTextArea, EuiSelect, EuiSuperSelect,
  EuiRadio, EuiRadioGroup, EuiBetaBadge, EuiPagination, EuiTreeView, EuiBreadcrumbs.
  Also use when fixing @elastic/eui ESLint accessibility rules.
---

# Accessibility (Kibana)

This skill is the **canonical reference for using EUI accessibly**. Open it whenever you author or refactor EUI components — *before* writing the JSX, not only after lint complains.

## When to use this skill

- **Primary — writing or refactoring an EUI component.** Open the matching guide in `references/components/index.md` and follow the canonical pattern (props, naming, focus, ids).
- **Refactoring legacy markup.** Use the same component guides to bring existing JSX in line with the canonical pattern.
- **Secondary — fixing an `@elastic/eui/*` ESLint error.** Use `references/eslint.md` to jump to the relevant component guide.
- **General a11y or non-EUI question.** Read `references/shared_principles.md`.

## Find the right guide

| You are… | Open |
|----------|------|
| Adding or refactoring an **EUI component** | `references/components/index.md` → matching guide |
| Resolving a non-EUI a11y concern | `references/shared_principles.md` |
| Working from an `@elastic/eui/*` rule id | `references/eslint.md` (links into the component guide) |

## Read shared principles first

Always read `references/shared_principles.md` before authoring or refactoring. It defines the standards (WCAG / APG), the canonical decision order (semantics → structure → behavior → lifecycle), accessible naming, keyboard and focus expectations, project i18n / HTML-id contracts, and escalation criteria. The component guides are component-specific extensions of these principles.

## Layout

```
references/
  shared_principles.md   ← read first
  i18n.md                ← localization contract
  html_ids.md            ← id / aria-labelledby utilities
  eslint.md              ← rule id → component guide (secondary)
  components/
    index.md             ← topic → guide
    *.md                 ← canonical usage per component
```
