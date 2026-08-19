# Design exploration variants

POC chrome overrides gated by `core.chrome.designExploration` (requires Chrome Next).

## Naming convention

| Display name | Slug id | Style file |
|--------------|---------|------------|
| Verbana | `verbana` | `variant_verbana.tsx` |
| Baseline | `baseline` | `variant_baseline.tsx` |
| Linbana | `linbana` | `variant_linbana.tsx` |
| Attbana | `attbana` | `variant_attbana.tsx` |
| Interbana | `interbana` | `variant_interbana.tsx` |
| Nirbana | `nirbana` | `variant_nirbana.tsx` |
| Target | `target` | `variant_target.tsx` |

- Slug ids must match `DESIGN_EXPLORATION_VARIANT_OPTIONS` in `@kbn/core-chrome-feature-flags`.
- CSS is scoped with `body[data-design-exploration='true'][data-design-exploration-variant='{slug}']`.

## Add a variant

1. Create `variant_{slug}.tsx` exporting `create{PascalSlug}Styles(euiTheme)`.
2. Register in `design_exploration_variants.ts`.
3. Add `{ id, label }` to `DESIGN_EXPLORATION_VARIANT_OPTIONS` in `@kbn/core-chrome-feature-flags/index.ts`.
4. Switch via the **Design exploration** control in the dev toolbar (`#developerToolbar`).

Switching variants writes sessionStorage and reloads the page.
