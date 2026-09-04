# SharedUX Flyout System Examples

A Kibana example plugin to demonstrate the SharedUX Flyout System.

## Overview

This plugin provides two example implementations, both rendering `FlyoutTemplate` — one composed
directly and one opened through core:

1. **Flyout Template**: Flyouts built directly with `@kbn/flyout-template` — the recommended way
   to compose flyout content in Kibana.
2. **Core service**: Flyouts opened imperatively with `core.overlays.openFlyoutTemplate`, which
   renders the same `FlyoutTemplate` from the template's props plus a callback returning its
   zones. The child flyouts render with a collapsed header (`<T.Header collapsed />`).

Neither widget demos every part `FlyoutTemplate` supports (e.g. `Body.Accordion`, tabs, header
badges/info blocks) — that full part matrix is covered by the template's Storybook
(`flyout_template.stories.tsx`), not by this example. This plugin's job is demonstrating the
*service* integration: sessions, history, cascade close, and URL-backed state.
