# Content Management Service - Current State Analysis

## Document Purpose

This document provides a comprehensive overview of the Content Management service's current state, capabilities, usage patterns, and gaps. It serves as a reference for engineers and stakeholders understanding the service's scope and maturity.

**Related Documents:**
- **[CURRENT_USAGE.md](./CURRENT_USAGE.md)** - TableListView usage patterns
- **[CURRENT_FEATURES.md](./CURRENT_FEATURES.md)** - Feature inventory
- **[CURRENT_IMPL.md](./CURRENT_IMPL.md)** - Technical implementation details

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Is Content Management?](#what-is-content-management)
3. [Architecture Overview](#architecture-overview)
4. [Current Capabilities](#current-capabilities)
5. [Content Types Currently Registered](#content-types-currently-registered)
6. [Supplementary Packages and Features](#supplementary-packages-and-features)
7. [Where It Is Being Used](#where-it-is-being-used)
8. [What Is Lacking or Not Yet Implemented](#what-is-lacking-or-not-yet-implemented)
9. [Roadmap and Future Work](#roadmap-and-future-work)
10. [Key Links](#key-links)
11. [Summary](#summary)

---

## Executive Summary

The Content Management service provides a unified abstraction layer for managing user-generated content in Kibana. It serves as a replacement for direct Saved Object client usage, offering versioned CRUD APIs, client-side caching, backward compatibility (BWC) support for zero-downtime deployments, and a growing ecosystem of content-related features.

**Owner Team:** [@elastic/appex-sharedux](https://github.com/orgs/elastic/teams/appex-sharedux)

---

## What Is Content Management?

The Content Management plugin provides a single abstraction for Kibana content that traditionally relied on Saved Objects. Its goals include:

- **Unified API:** Consistent CRUD and search interfaces across content types.
- **Versioning and BWC:** Supports backward compatibility for zero-downtime upgrades (especially important for Serverless).
- **Client-Side Caching:** Browser requests are automatically cached.
- **Event Emission:** Server-side events (`getItemStart`, `getItemSuccess`, etc.) for observability.
- **Future Extensibility:** Foundation for personalization, private objects, and content folders.

---

## Architecture Overview

```
+---------------------------------------------------------------------+
|                           Browser                                    |
|  +----------------------------------------------------------------+ |
|  |  Content Type Registry (Public)                                 | |
|  |  - Registers content types with version info                    | |
|  |  - Provides CRUD client per type                                | |
|  +----------------------------------------------------------------+ |
|  +----------------------------------------------------------------+ |
|  |  ContentClient                                                  | |
|  |  - Typed CRUD methods: get, bulkGet, create, update, delete    | |
|  |  - search() and mSearch() for querying                         | |
|  |  - Caching layer                                                | |
|  |  - Version negotiation                                          | |
|  +----------------------------------------------------------------+ |
|                              | HTTP                                  |
+------------------------------+--------------------------------------+
                               v
+---------------------------------------------------------------------+
|                           Server                                     |
|  +----------------------------------------------------------------+ |
|  |  RPC Routes                                                     | |
|  |  - /api/content_management/rpc/{procedure}                      | |
|  |  - Procedures: get, bulkGet, create, update, delete,           | |
|  |                search, mSearch                                   | |
|  +----------------------------------------------------------------+ |
|  +----------------------------------------------------------------+ |
|  |  Content Registry (Server)                                      | |
|  |  - Stores content type definitions                              | |
|  |  - Associates each type with a ContentStorage implementation    | |
|  +----------------------------------------------------------------+ |
|  +----------------------------------------------------------------+ |
|  |  ContentStorage (per content type)                              | |
|  |  - Implements CRUD + search against Saved Objects               | |
|  |  - Handles version transforms (up/down)                         | |
|  |  - Validates schemas                                            | |
|  +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ContentManagementPlugin` (server) | `src/platform/plugins/shared/content_management/server/plugin.ts` | Server plugin entry point, registers RPC routes and favorites. |
| `ContentManagementPlugin` (public) | `src/platform/plugins/shared/content_management/public/plugin.ts` | Browser plugin, exposes `ContentClient` and registry. |
| `ContentRegistry` | `server/core/registry.ts` | Stores registered content type definitions. |
| `ContentStorage` | Interface in `server/core/types.ts` | Contract for implementing storage for a content type. |
| `ContentClient` | `public/content_client/content_client.tsx` | Browser client for CRUD operations with caching. |
| `RpcClient` | `public/rpc_client/rpc_client.ts` | Low-level HTTP client for RPC calls. |

---

## Current Capabilities

### Core CRUD and Search Operations

| Operation   | Description                                                              |
|-------------|--------------------------------------------------------------------------|
| `get`       | Retrieve a single content item by ID.                                     |
| `bulkGet`   | Retrieve multiple content items by IDs.                                   |
| `create`    | Create a new content item.                                                |
| `update`    | Update an existing content item.                                          |
| `delete`    | Delete a content item by ID.                                              |
| `search`    | Search within a single content type.                                      |
| `mSearch`   | Multi-type search across multiple content types (uses `savedObjects.find`). |

### Versioning and Backward Compatibility

- Each content type declares a `latest` version number.
- Browser clients send their version with every request.
- `up()` transforms convert incoming data from older versions to latest.
- `down()` transforms convert responses from latest to the client's version.
- This enables zero-downtime deployments where server and client versions may differ.

### Validation

- Runtime schema validation using `@kbn/config-schema`.
- Schemas defined per version in `cm_services.ts` files.
- Input validation on create/update; output validation on get/search.

### Caching

- Browser-side request caching via React Query integration.
- Reduces redundant network calls.

### Event Emission

- Server emits events for content operations (e.g., `getItemStart`, `getItemSuccess`).
- **Status:** Event stream infrastructure exists but is currently disabled/commented out in production.

---

## Content Types Currently Registered

The following plugins have registered content types with the Content Management service:

| Content Type           | Plugin                          | Location                                          |
|------------------------|---------------------------------|---------------------------------------------------|
| `lens`                 | Lens                            | `x-pack/platform/plugins/shared/lens`             |
| `map`                  | Maps                            | `x-pack/platform/plugins/shared/maps`             |
| `links`                | Links                           | `src/platform/plugins/private/links`              |
| `visualization`        | Visualizations                  | `src/platform/plugins/shared/visualizations`      |
| `graph-workspace`      | Graph                           | `x-pack/platform/plugins/private/graph`           |
| `index-pattern`        | Data Views                      | `src/platform/plugins/shared/data_views`          |
| `event-annotation-group` | Event Annotation              | `src/platform/plugins/private/event_annotation`   |
| `search`               | Saved Search                    | `src/platform/plugins/shared/saved_search`        |

### Registration Pattern

Server-side registration requires a `ContentStorage` implementation:

```typescript
// server/plugin.ts
contentManagement.register({
  id: CONTENT_ID,
  storage: new MapsStorage(),
  version: { latest: LATEST_VERSION },
});
```

Client-side registration provides metadata for the browser:

```typescript
// public/plugin.ts
plugins.contentManagement.registry.register({
  id: CONTENT_ID,
  version: { latest: LATEST_VERSION },
  name: 'Maps',
});
```

---

## Supplementary Packages and Features

Content Management includes a rich ecosystem of related packages located in `src/platform/packages/shared/content-management/`:

### Favorites (`@kbn/content-management-favorites-*`)

- **Status:** Implemented
- **Packages:** `favorites_common`, `favorites_public`, `favorites_server`
- Per-user, per-space favorite lists.
- Server-side storage in a `favorites` saved object type.
- Client: `FavoritesClient`, `useFavorites()` hook, `<FavoriteButton />` component.
- Tracks ambiguous object IDs (works with any content, not just saved objects).

### Content Insights (`@kbn/content-management-content-insights-*`)

- **Status:** Implemented
- **Packages:** `content_insights_public`, `content_insights_server`
- Tracks content usage (e.g., `viewed` events).
- Provides stats via usage collection plugin.
- Client: `ContentInsightsClient`, flyout for displaying view counts and weekly charts.

### Content Editor (`@kbn/content-management-content-editor`)

- **Status:** Implemented (basic)
- Modal-based inline editing for content metadata (title, description, tags).
- Duplicate title validation support.
- Activity history display.
- **Documentation:** Incomplete (see issue #144402).

### Tags Integration (`@kbn/content-management-tags`)

- **Status:** Implemented
- Integration with `savedObjectsTagging` service.
- Tag filtering in content lists.
- Tag management UI components.

### Access Control (`@kbn/content-management-access-control-*`)

- **Status:** Minimal implementation
- **Packages:** `access_control_public`, `access_control_server`
- Exports `AccessControlClient` and `AccessModeContainer` component.
- Helpers for checking privileges and changing access modes.
- **Documentation:** Minimal.

### User Profiles (`@kbn/content-management-user-profiles`)

- **Status:** Implemented
- Displays creator/modifier information.
- User avatar components.
- Filter by creator functionality.

### Table List View Components

Multiple packages provide UI for listing content:

| Package                                      | Description                                            |
|----------------------------------------------|--------------------------------------------------------|
| `@kbn/content-management-table-list-view`    | Full page wrapper with header and table.               |
| `@kbn/content-management-table-list-view-table` | Core table component with search, filters, actions. |
| `@kbn/content-management-tabbed-table-list-view` | Tabbed variant for multiple content types.          |
| `@kbn/content-management-table-list-view-common` | Shared types and utilities.                         |

### Content List (New Architecture)

- **Status:** In active development
- **Packages:** `kbn-content-list-provider`, `kbn-content-list-table`, `kbn-content-list-toolbar`, `kbn-content-list-docs`, `kbn-content-list-mock-data`
- Redesigned composable architecture replacing the monolithic `TableListView`.
- Provider-based state management with feature-based hooks.
- Goal: Reduce complexity, improve flexibility, enable new layouts (grid, cards).

---

## Where It Is Being Used

### Primary Consumers (TableListView/TableListViewTable)

| Application          | Features Used                                                                |
|----------------------|------------------------------------------------------------------------------|
| **Dashboard**        | Full-featured: favorites, recently accessed, content editor, CRUD, creator filtering. |
| **Visualizations**   | Tabbed variant, custom columns (type icons), custom sorting, CSS styling.    |
| **Maps**             | Simple implementation, minimal customization.                                |
| **Graph**            | Custom empty prompts, sample data integration.                               |
| **Files Management** | Embedded without page template, custom actions.                              |
| **Event Annotations**| Direct table usage.                                                          |

### Usage Complexity Spectrum

1. **Maps** - Simplest consumer ("happy path"), minimal configuration.
2. **Graph** - Adds custom empty prompts and sample data.
3. **Files Management** - Custom actions, embedded mode.
4. **Event Annotations** - Direct table component usage.
5. **Visualizations** - Tabbed UI, custom columns, custom CSS.
6. **Dashboard** - Most complex: all features, custom validators, children slots.

### Integration Example

```typescript
// Using the ContentClient in application code
import { mapsClient } from './content_management';

// Get a map
const { item } = await mapsClient.get(mapId);

// Create a map
const { item: newMap } = await mapsClient.create({
  data: mapAttributes,
  options: { references },
});

// Update a map
await mapsClient.update({
  id: mapId,
  data: updatedAttributes,
  options: { references },
});
```

---

## What Is Lacking or Not Yet Implemented

### Event Stream (Disabled)

The Event Stream service infrastructure exists but is commented out in production:

```typescript
// server/plugin.ts
// TODO: Enable Event Stream once we ready to log events.
// this.#eventStream = new EventStreamService({ ... });
```

- Implementation exists for both Elasticsearch (`EsEventStreamClient`) and in-memory testing.
- Would store events in `.kibana-event-stream` data stream.
- Blocked pending readiness to enable event logging.

### Private/Personal Objects

The vision document mentions "private objects" as a future capability:
- No implementation currently exists in the Content Management service.
- Would require integration with Kibana's space and user context.
- Referenced in landing page: "...eventually a collection of new features that enhance content items by adding additional capabilities for personalization, private objects..."

### Content Folders

Referenced as a planned feature for organizing content:
- Not implemented.
- Would enable hierarchical organization of content items.
- Mentioned alongside private objects in the vision.

### Dedicated Search Layer

The `mSearch` API is described as "temporary":

> "Until we have a dedicated search layer in CM services, we provide a separate temporary `MSearch` api..."

- Current `mSearch` relies directly on `savedObjects.find`.
- A unified search layer would abstract over saved objects.
- Would enable more sophisticated search capabilities.

### Access Control (Limited)

- Basic helpers exist but lack comprehensive documentation.
- No deep integration with content-level permissions.
- Current implementation is minimal: `AccessControlClient` and `AccessModeContainer`.

### Documentation Gaps

Several packages have incomplete documentation:
- Content Editor: References TODO issue #144402.
- Table List View: Same TODO reference.
- Access Control: Minimal README ("Helpers for access control management.").

### Content Types Not Yet Migrated

Not all Kibana content types use Content Management. Potential candidates include:
- Canvas workpads
- Alerts/Rules
- Cases
- Other saved object types that could benefit from the abstraction.

---

## Roadmap and Future Work

### ContentListProvider Architecture (In Progress)

A phased refactoring of `TableListView` into composable components:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core Provider and State Management | Implemented |
| Phase 2 | Basic Rendering Components | Implemented |
| Phase 3 | Advanced Features | In Progress |
| Phase 4 | Page Wrapper and Layout | Planned |
| Phase 5 | Migration Support | Planned |
| Phase 6 | Consumer Migrations | Planned |

### New Features Under Consideration

From GitHub issue #159995:

1. **Initial Filter State:** Pre-select tags, users, or favorites on load (Security team requirement).
2. **Preview Popovers:** Show content preview on hover/click without navigation (Visualisation team requirement).
3. **Analytics and Telemetry Hooks:** Track user interactions for usage metrics (Content Management requirement per issue #160016).

### Architecture Goals

1. **Reduce complexity** - Break the monolithic component into focused components.
2. **Improve flexibility** - Enable composition over configuration.
3. **Maintain compatibility** - Support existing features.
4. **Enable innovation** - Make new layouts (grid, cards) easy to add.
5. **Improve DX** - Better TypeScript, clearer APIs, easier testing.

### Long-Term Vision

From the landing page documentation:

> "...eventually a collection of new features that enhance content items by adding additional capabilities for personalization, private objects and content folders."

---

## Key Links

| Resource | Location |
|----------|----------|
| Plugin (Server and Public) | `src/platform/plugins/shared/content_management/` |
| Packages | `src/platform/packages/shared/content-management/` |
| Onboarding Guide | `src/platform/plugins/shared/content_management/docs/content_onboarding.mdx` |
| Landing Page | `src/platform/plugins/shared/content_management/docs/conent_management_landing.mdx` |
| API Reference | `/kibana-dev-docs/api/contentManagement` |
| GitHub Team | [@elastic/appex-sharedux](https://github.com/orgs/elastic/teams/appex-sharedux) |
| ContentList Plan | `src/platform/packages/shared/content-management/content_list/kbn-content-list-docs/plan/` |

---

## Summary

The Content Management service is a **maturing abstraction layer** that provides:

**Implemented:**
- Versioned CRUD and Search APIs
- Client-side caching
- Favorites, Content Insights, Tags integration
- Table list view components
- Basic content editor
- User profiles integration
- BWC support for zero-downtime deployments

**In Progress:**
- New `ContentListProvider` composable architecture
- Access control expansion
- Documentation improvements

**Not Yet Implemented:**
- Event stream (infrastructure exists but disabled)
- Private/personal objects
- Content folders
- Dedicated search layer
- Comprehensive access control

The service is actively used by Dashboard, Visualizations, Maps, Graph, and other content-heavy applications, providing a consistent experience for managing user-generated content across Kibana. The ongoing `ContentListProvider` refactoring aims to modernize the UI layer while maintaining feature parity with the existing `TableListView`.

