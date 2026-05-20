# Kibana layout

| Information | Details |
| --- | --- |
| **Date** | 2026-05-19 |
| **Author** | [@katesosedova](https://github.com/katesosedova) |
| **Relevant links** | [Chrome layout (engineering)](../../core/packages/chrome/layout/layout_overview.mdx) · [EUI](https://eui.elastic.co) |

---

## Overview

Kibana’s refreshed layout splits the screen into **chrome** (global shell) and the **application workspace** (where apps like Discover and Dashboards render). Chrome stays visible during normal use; the application area can be covered temporarily by flyouts. Components are sized and positioned together through a **CSS grid** (`GridLayout` in `@kbn/core-chrome-layout`) so navigation, header, sidebar, and main content share one coordinate system.

This document is a **design-oriented overview**. Package-specific guidelines live under each component in this directory.

---

## Layout areas

| Area | Purpose |
| --- | --- |
| **Chrome** | Global controls and wayfinding: header, left navigation, optional right sidebar, banners, and footer. Persists across apps unless chrome is hidden (for example full-screen or chromeless views). |
| **Application workspace** | Current app UI: optional app menu bar, main scrollable content, in-app flyouts, and optional bottom bar. Flyouts are scoped to this region, not the full viewport. |

---

## Chrome and application parts

| Part | Role | Guidelines |
| --- | --- | --- |
| **Global header** | Platform-level navigation and wayfinding (shared across Elastic surfaces). Breadcrumbs anchor users from the platform root. | *(TBD)* |
| **Left navigation** | Deployment- and solution-level IA (Observability, Security, Elasticsearch, and similar). | [Solution-focused side navigation](./side-navigation/README.md) |
| **Application workspace** | App-specific pages, tools, and in-page navigation. | *(TBD)* |
| **App menu** | Context-aware actions and sub-navigation for the open app (project chrome). | *(TBD)* |
| **Flyouts** | Temporary panels for secondary tasks or detail without leaving the current app flow. | [EUI flyouts](https://eui.elastic.co/docs/components/containers/flyout/) · *(Kibana guidelines TBD)* |
| **Sidebar (right)** | Cross-app workflow tools that stay open while users move between pages (until closed). | *(TBD)* |
| **Bottom bar** | Reserved in the layout model; product use is not defined yet. | *(TBD)* |

---

## Global grid

Kibana renders chrome through `ChromeLayout` and a single root **CSS grid**:

```
banner    | banner    | banner
header    | header    | header
navigation | application | sidebar
footer    | footer    | footer
```

- **Columns:** left navigation (dynamic width) · application (`1fr`) · right sidebar (dynamic width).
- **Rows:** optional banner · header · main row · optional footer.
- **Sizing:** `navigationWidth` and `sidebarWidth` come from chrome services at runtime; the application column fills remaining horizontal space. Layout dimensions are exposed as CSS variables (`--kbn-*`) via `@kbn/core-chrome-layout-constants` for overlays, flyouts, and custom UI.

Chrome styles: **classic** (legacy) and **project** (solution-focused). Project layout uses a 48px header, optional 48px app menu bar, and solution left navigation wired from core chrome.

Engineering detail: [Chrome layout (grid)](../../core/packages/chrome/layout/layout_overview.mdx).

---

## Layering and focus

| Layer | Typical z-order | Behavior |
| --- | --- | --- |
| Application content | Base | Main scroll container for the open app. |
| Header / app bars | Above content | Fixed within the grid. |
| Left navigation | High (`999`) | Persists beside the application area. |
| Sidebar / banner | Above flyouts (`1050`) | Can sit above standard EUI flyouts (`1000`). |
| Flyouts (in app workspace) | Within application bounds | Masks and panels align to the application region, not under the global header. |

Use a **modal** when the user must complete a separate task without interacting with the rest of the screen (includes a blocking mask). Use a **flyout** for supplementary work that may relate to another app or the sidebar; flyouts do not use a full-screen mask and may push or overlay within the application workspace.

---

## Responsive behavior (summary)

| Part | Design intent | Notes |
| --- | --- | --- |
| **Left navigation** | Secondary panel target width 240px (min 200, max 360); user-resizable (planned). | Implementation: primary bar 100px expanded / 48px collapsed; secondary panel fixed at 248px. See [modes](./side-navigation/wiki/product/modes.md). |
| **Left navigation (narrow viewports)** | When application workspace width is ≤ 1000px, collapse navigation so content keeps usable width; hide manual expand when forced. | Implemented via viewport-based auto-collapse of the **whole** left nav (icons-only + popovers), not secondary panel alone. |
| **Sidebar (right)** | Default ~30% of viewport, min 320px, max ~40%. | Code: default 30%, min 320px, **max 50%** of viewport. No auto-collapse when app + sidebar are both narrow (may change later). |
| **Application workspace** | Takes remaining space; flyouts cannot exceed this region. | Width = viewport minus left nav, right sidebar, and chrome margins. |

---

## Packages in `@kbn/kbn-ui`

| Package | Description |
| --- | --- |
| [`side-navigation`](./side-navigation/README.md) | Solution-focused left navigation UI (`@kbn/ui-side-navigation`), consumed by Kibana chrome. |

---

## Related engineering locations

| Topic | Location |
| --- | --- |
| Grid layout service | `src/core/packages/chrome/layout/core-chrome-layout/` |
| Layout components & CSS variables | `src/core/packages/chrome/layout/core-chrome-layout-components/` |
| Chrome browser integration | `src/core/packages/chrome/browser-components/` |
| Right sidebar | `src/core/packages/chrome/sidebar/` |
