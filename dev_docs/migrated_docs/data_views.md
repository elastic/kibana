---
id: kibDataViewsKeyConcepts
slug: /kibana-dev-docs/key-concepts/data-view-intro
title: Data Views
description: Data views are the central method of defining queryable data sets in Kibana
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'api docs']
---

## Overview

> [!NOTE]
> Kibana index patterns are being renamed to data views. You may see some naming inconsistencies during this transition.

Data views (formerly Kibana index patterns or KIPs) define queryable data sets in Kibana. They're the central method for describing sets of indices and are strongly recommended since many high-level [building blocks](/kibana-dev-docs/key-concepts/building-blocks) rely on them. They provide a consistent view of data across Kibana apps.

## How data views work

Data views consist of:

- **Index pattern**: A wildcard string that matches indices, data streams, and index aliases
- **Timestamp field**: Optional field for time series data  
- **Storage**: Saved as a [saved object](/kibana-dev-docs/key-concepts/saved-objects-intro)
- **Field list**: All fields from matching indices plus runtime fields defined on the data view
- **Schema-on-read**: Functionality provided through data view runtime fields

![Data view diagram](assets/data_views_data_view_diagram.png)

## Using data views

### API access

The data view API is available via the data plugin:
- `data.indexPatterns` (being renamed)
- Most commonly used with [SearchSource](/kibana-dev-docs/tutorials/data/search-and-sessions#high-level-search) (`data.search.search.SearchSource`)

SearchSource automatically applies existing filters and queries from the search bar UI.

### Creating data views

**Via UI**: Users can create data views through [Data view management](https://www.elastic.co/guide/en/kibana/current/index-patterns.html)

**Via API**: Create programmatically through the data view API

### Field customization

Data views support:
- Custom field formatters
- Custom field labels
- Runtime field definitions

## Services

### hasData service

Provides standardized methods to check empty states:

```typescript
hasESData: () => Promise<boolean>; // Check if ES data exists
hasDataView: () => Promise<boolean>; // Check if any data view exists (managed or user created)
hasUserDataView: () => Promise<boolean>; // Check if user created data views exist
```