---
name: accessibility
disable-model-invocation: true
description: Accessibility guidance for Kibana. Use this skill when working with or reviewing EUI components, resolving a11y-related (@elastic/eui) ESLint issues, and ensuring proper use of ARIA attributes, focus management, keyboard interactions, and accessible naming conventions.
---

# Kibana Accessibility

> Accessibility is part of writing the component, not a step that happens after lint complains. Open the matching guide in `references/components/index.md` **before** writing the JSX, and read `references/shared_principles.md` first.

## When to Use

- **Writing or refactoring an EUI component.** Open the matching guide from `references/components/index.md` and follow the canonical pattern (props, accessible names, focus, ids).
- **Fixing an `@elastic/eui/*` ESLint error.** Use `references/eslint.md` to jump from the rule id to the component guide that explains the canonical fix.
- **General a11y or non-EUI question.** Read `references/shared_principles.md`.

## References

Open only what you need:

- Standards, decision order, accessible naming, i18n, html ids, keyboard/focus, escalation: `references/shared_principles.md`
- Component guide topic table: `references/components/index.md`
- ESLint rule id → component guide (with manual-review notes): `references/eslint.md`
