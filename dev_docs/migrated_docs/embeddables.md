---
id: kibDevDocsEmbeddables
slug: /kibana-dev-docs/key-concepts/embeddables
title: Embeddables
description: Documentation and examples.
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'api docs']
---

Embeddables let you integrate custom visualizations and widgets into Dashboard and Canvas applications.

## Documentation

Complete embeddable documentation: [@kbn/embeddable-plugin/README.md](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/embeddable/README.md)

## Quick overview

**What are embeddables?**
- Reusable UI components that can be embedded in other applications
- Primary use: Dashboard panels (Lens charts, Maps, Discover sessions)
- Secondary use: Canvas workpads

**Key benefits**:
- **Dashboard integration** - Users can add your visualization as dashboard panels
- **Consistent UX** - Automatic context menus, time ranges, filters
- **UI Actions support** - Drilldowns, sharing, custom actions

**Common embeddable types**:
- Visualizations (charts, graphs)
- Data tables  
- Maps
- Custom widgets

See the linked README for implementation examples and detailed API documentation.