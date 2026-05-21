# Kibana layout

**Date**: 2026-05-21
**Author**: [@ek-so](https://github.com/katesosedova)
**Descriptio**n: Kibana layout structure and overview: how different pieces come together
**Relevant links**: [Chrome layout (core package)](../../core/packages/chrome/layout/layout_overview.mdx)
**Tags**: `kibana`, `dev`, `chrome`, `layout`, `grid`

---

## Product

### Overview

This document defines a unified terminology for Kibana’s updated layout and its core components. It provides a concise overview of how these components interact, influence each other, and operate together to form a seamless user experience. The Kibana layout is organized into two main areas, each with a specific role: **chrome** (which provides persistent global controls and wayfinding across all apps) and the **application workspace** (the area where applications are rendered). All layout components are designed to work together cohesively, shaping clear user expectations for how each part fits and functions within the overall system.

Kibana chrome supports two styles: the legacy **classic** chrome (still available but no longer actively developed) and the new **project** (solution-focused) chrome, which is the default and the basis for the guidelines below. The project chrome is actively enhanced and represents the recommended experience moving forward.

### Anatomy

**Chrome parts**

| Part | Purpose |
| --- | --- |
| Global header | Platform-level navigation and wayfinding (shared across Elastic surfaces) |
| [Side navigation](./side-navigation/README.md) | Deployment- and solution-level IA (Observability, Security, Elasticsearch, and similar)|
| Sidebar | Cross-app workflow tools that stay open while users move between pages (until closed)|
| Bottom bar | Reserved in the layout model; product use is not defined yet. |
 
**Application workspace parts**

| Part | Purpose |
| --- | --- |
| Application workspace | App-specific pages, tools, and in-page navigation. |
| Page header | *Guidelines tbd* |
| App menu | Context-aware actions for the open app. |
| [Flyouts](https://eui.elastic.co/docs/components/containers/flyout/) | Temporary panels for secondary tasks or detail without leaving the current app flow. *(Kibana flyout guidelines TBD)* |

Components are sized and positioned together through a single root **CSS grid** (`GridLayout` in `@kbn/core-chrome-layout`) so navigation, header, sidebar, and main content share one coordinate system:

```
banner    | banner    | banner
header    | header    | header
navigation | application | sidebar
footer    | footer    | footer
```

### Behaviour

**Responsiveness**

TBD

**Modal views**

Kibana uses two types of temporary panels, each with a clear, distinct purpose:

- **Modal windows ([EuiModal](https://eui.elastic.co/docs/containers/modal/)):** Used for important tasks that need the user's full attention. While a modal is open, everything else is blocked and dimmed out with a dark overlay. You must finish or close the modal before you can do anything else in the app.

- **Flyouts ([EuiFlyout](https://eui.elastic.co/docs/components/containers/flyout/)):** Used for side tasks or to show extra details, without taking you away from your main work. Flyouts open alongside the main content and don’t use a full-screen overlay, so you can still see (and sometimes interact with) the main application while the flyout is open.

---

## Engineering
