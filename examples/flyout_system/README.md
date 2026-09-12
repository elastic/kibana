# SharedUX Flyout System Examples

A Kibana example plugin to demonstrate the SharedUX Flyout System.

## Overview

This plugin provides two example implementations, both rendering `FlyoutTemplate` — one composed
directly and one opened through core:

1. **Flyout Template**: Flyouts built directly with `@kbn/flyout-template` — the recommended way
   to compose flyout content in Kibana.
2. **Core service**: Flyouts opened imperatively with `core.overlays.openFlyoutTemplate`, which
   renders the same `FlyoutTemplate` from the template's props plus a component that composes
   its zones. The child flyouts render with a collapsed header
   (`<FlyoutTemplate.Header collapsed />`).

Both widgets render the template's full set of parts, allowing accessibility behavior to be tested in a real browser. The surface is split across the two widgets because `Body.Section` and `Body.Accordion` cannot be mixed in one body, and tabbed mode ignores top-level `Body` children:

| | Flyout Template widget | Core service widget |
| --- | --- | --- |
| Header blocks | 3 meta blocks, 6 badges, 10 info blocks | same |
| Body | `Body.Section` plus `Section.Subsection` | `Body.Accordion` plus `Accordion.Subsection` |
| Tabs | none | three tabs, everything reachable on the first |
| Footer | secondary and primary actions | same |

Every flyout carries a root `data-test-subj` (`flyoutComponent<Session>` and
`flyoutOverlays<Session>`, plus `…Child<A|B>`). The Scout suite under
`test/scout_examples/ui` uses these to scope accessibility scans to one flyout at a time, preventing errors when a child flyout is open over its parent.
