# Kibana integration

## Overview

In Kibana, solution-focused navigation is rendered through **chrome**, not by each plugin importing `Navigation` directly. Plugins register applications and deep links; chrome builds the `NavigationStructure` and supplies `activeItemId`, collapse state, and width to the layout grid.

## Responsibilities

| Layer | Owns |
| --- | --- |
| Chrome / core | Collapse persistence, nav tree assembly, active route id, layout grid width |
| Solution plugins | App registration, hrefs, `badgeType` in nav config where supported |
| `@kbn/ui-side-navigation` | Presentation, overflow, popovers, a11y behavior |

## Checklist for plugin authors

1. Register apps with stable **`id`** values that match navigation entries.
2. Keep **page titles** aligned with secondary menu labels.
3. Use **`badgeType`** sparingly; respect new-badge limits (max 2 primary, max 2 per parent secondary).
4. Do not embed announcements or messaging in nav config.
5. For external Cloud links, set **`isExternal: true`**.

## Documentation

**Source of truth:** [`README.md`](../../README.md) and the [`wiki/`](../../wiki/) directory in this package.

**Kibana dev docs (published):** [/kibana-dev-docs/chrome/navigation](https://www.elastic.co/guide/en/kibana/master/chrome-navigation.html) — landing page in `dev_docs/shared_ux/chrome_navigation.mdx` links here.

## Related platform docs

- Workspace chrome (secondary auto-collapse at narrow workspace widths).
- Classic vs solution navigation: solution-focused navigation is the Kibana default since the October 2023 Serverless update.
