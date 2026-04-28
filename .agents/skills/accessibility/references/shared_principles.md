# Shared principles (accessibility)

These principles apply to every Kibana accessibility decision — when **writing new code**, **refactoring**, or **fixing a lint error**. The component guides under `components/` are component-specific extensions of this document.

**Precedence on conflict:**

1. Task-specific user or system instruction
2. This document
3. Component guide (`components/*.md`) or ESLint bridge (`eslint/fix-*.md`)

## Standards

- Meet **WCAG 2.2 AA**.
- Follow the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) for widget patterns.
- Prefer EUI components over native HTML — EUI handles aria attributes, focus, and keyboard out of the box. Use native HTML only when no suitable EUI component exists.
- Prefer semantic HTML over ARIA — add ARIA only when native semantics are insufficient.

## Authoring decision order

Whether you are writing a new component or fixing existing code, work top-down and stop at the first level that resolves the need:

1. **Semantics.** Pick the right element / EUI component and use its built-in props (`label`, `htmlFor`, `aria-label`, `aria-labelledby`, `aria-describedby`, roles).
2. **Structural wiring.** Connect visible text to controls via stable ids (`id` + `aria-labelledby`) instead of duplicating strings into hidden labels.
3. **Behavior.** Adjust keyboard / focus behavior only when semantics are already correct.
4. **Lifecycle hacks last.** `useEffect` for focus or announcements is a fallback — only when no declarative alternative exists.

## Accessible naming

- Every interactive element needs an accessible name — buttons, links, inputs, selects, custom controls.
- Prefer **visible text** (labels, headings, button text) for the name; wire it with **`aria-labelledby`** + a stable id rather than duplicating into **`aria-label`**.
- Use **exactly one** naming mechanism per control — not both **`aria-label`** and **`aria-labelledby`**.
- Do not remove `title`, `alt`, `aria-label`, or `aria-labelledby` unless replacing with a stronger alternative.
- Images that convey meaning need `alt`; decorative images use `alt=""` or `aria-hidden="true"`.

## Keyboard and focus

- Every interactive element must be reachable and operable from the keyboard alone.
- Use native focusable elements (`<button>`, `<a>`, `<input>`) over `div` + `onClick` + `tabIndex`.
- Do not remove or hide visible focus indicators.
- Focus order follows the logical reading sequence.
- Modals and flyouts trap focus and return it to the trigger on close.
- Custom shortcuts must not conflict with browser / screen reader shortcuts.

## Minimal, deterministic changes

- Apply the smallest change that fits the canonical pattern.
- No unrelated refactoring, layout / logic / license-header changes.
- Preserve existing behavior and intent.
- Same code shape → same outcome (no subjective styling tweaks).

## Type safety

- Do not widen types (`string` → `any`) or suppress errors (`@ts-ignore`, `as any`).
- New props must match the component’s type definition.

## Project references

- **i18n:** `project/i18n.md`
- **HTML ids** (`id`, `aria-labelledby`, `titleProps.id`): `project/html_ids.md`

## When to escalate

Stop and flag for human review when:

- **Spread props hide wiring.** `{...props}` on the component and you cannot trace whether `aria-labelledby`, `aria-label`, `name`, etc. are already supplied.
- **No visible title exists** and adding one would change UX / layout — needs design or PM input.
- **Conflicting requirements** without a clear trade-off (e.g. adding `aria-label` would duplicate a `title`, but removing `title` breaks another consumer).
- **Uncertain intent.** You cannot tell from the surrounding code whether a label, caption, or name accurately describes the element’s purpose.

## Change boundaries

- Do not add narration comments to updated lines; do not delete existing comments unless the guide explicitly says to.
- If a test assertion fails because the DOM changed, update **only** that assertion — never delete or skip the test.
