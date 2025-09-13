---
id: kibBuildingBlocks
slug: /kibana-dev-docs/key-concepts/building-blocks
title: Building blocks
description: Consider these building blocks when developing your plugin.
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev', 'architecture']
---

Kibana provides architectural building blocks ranging from high-level to low-level abstractions.

**High-level building blocks**:
- ✅ Built-in capabilities and less maintenance
- ✅ Consistent feature evolution across Kibana
- ❌ Less flexibility

**Low-level building blocks**:
- ✅ Greater flexibility
- ❌ More glue code and maintenance
- ❌ UI/UX variability

**Example**: Apps using [Index Patterns](#index-patterns) + [Search Source](#search-source) automatically support runtime fields. Apps using [Search Strategies](#search-strategies) require additional work.

## Application building blocks

### UI Components

**Query Bar** - High-level search component with Lucene, KQL, and Saved Queries support
- **Team**: `AppServices` | **Feature**: `QueryBar`

**Dashboard Embeddable** - Complete dashboard with visualizations that integrates with Query Bar
- Auto-includes all registered embeddables (Lens, Maps, Discover)
- Includes UI Actions (drilldowns, time ranges, sharing)
- **Team**: `Presentation` | **Feature**: `Dashboard`

**Lens Embeddable** - Data visualizations without query building
- Built on [Expressions](#expressions)
- Integrates with [Index Patterns](#index-patterns) and [UI Actions](#ui-actions--triggers)
- Can link to prefilled Lens editor
- **Team**: `Visualizations` | **Feature**: `Lens`

**Map Embeddable** - Embedded maps
- **Team**: `Geo`

**KibanaPageTemplate** - Standard page layout wrapper
- Wraps [EuiPageTemplate](https://elastic.github.io/eui/#/layout/page)
- See [KibanaPageTemplate tutorial](/kibana-dev-docs/tutorials/kibana-page-template)
- **Team**: `EUI`

### Search Components

**Index Patterns** - High-level, space-aware data abstraction
- Sits above Data Streams and Elasticsearch indices
- User-customizable: indices, runtime fields, formatting, labels
- Used by many other building blocks
- **Team**: `AppServices` | **Feature**: `Index Patterns`

**Search Source** - High-level search service
- Requires [Index Patterns](#index-patterns)
- Abstracts ES DSL and endpoints
- Uses [Search Strategies](#search-strategies) internally
- **Team**: `AppServices` | **Feature**: `Search`

**Search Strategies** - Low-level search abstraction
- Lightweight layer above elasticsearch-js client
- Supports ES, EQL, SQL
- Requires significant glue code
- **Team**: `AppServices` | **Feature**: `Search`

**Expressions** - Low-level data manipulation
- Advanced search with piping, joining, data manipulation
- Used by Lens and Canvas
- Most apps should use [Lens](#lens-embeddable) or [Search Source](#search-source) instead
- **Team**: `AppServices` | **Feature**: `ExpressionLanguage`

### Data Persistence

**Saved Objects** - Application-level persistence
- Built-in: bulk export/import, security, spaces, tags
- Example: TODO items in a TODO app
- See [Saved Objects](/kibana-dev-docs/key-concepts/saved-objects-intro)
- **Team**: `Core` | **Feature**: `Saved Objects`

**Advanced Settings** - Application configuration
- User-configurable settings
- Example: `pageListingSize` for items per page
- See [Advanced Settings tutorial](/kibana-dev-docs/tutorials/advanced-settings)
- **Team**: `Core` | **Feature**: `uiSettings`, `Advanced Settings`

## Integration building blocks

Create inter-connected, cross-application experiences:

**UI Actions & Triggers** - Custom actions in other applications
- Register actions that appear in other apps
- Example: "View in Maps" action for geo fields
- **Team**: `AppServices` | **Feature**: `UIActions`

**Embeddables** - Dashboard integration
- Register custom widgets for Dashboard panels
- Can also appear in Canvas workpads
- See [Embeddables](/kibana-dev-docs/key-concepts/embeddables)
- **Team**: `AppServices` | **Feature**: `Embeddables`