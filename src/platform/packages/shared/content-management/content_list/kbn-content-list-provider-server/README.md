# @kbn/content-list-provider-server

Server-side Content List Provider for Kibana.

## Overview

This package provides a server-side strategy for content listing using the `/internal/content_management/list` API. All sorting, filtering, and pagination is delegated to the server for better performance with large datasets.

## When to Use

Use this provider when:

- Working with **larger datasets** (> 10,000 items)
- Content types lack `.keyword` mappings on text fields
- Advanced search capabilities are needed (full ES query DSL)
- Multi-type searches are required

For smaller datasets or legacy `TableListView` compatibility, use [`@kbn/content-list-provider-client`](../kbn-content-list-provider-client) instead.

## Usage

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';

const MyContentList = () => {
  const savedObjectsTagging = savedObjectsTaggingService?.getTaggingApi();

  return (
    <ContentListServerKibanaProvider
      entityName="map"
      entityNamePlural="maps"
      savedObjectType="map"
      searchFieldsConfig={{
        additionalAttributes: ['status', 'version'],
      }}
      services={{
        core: coreStart,
        savedObjectsTagging: savedObjectsTagging,
        favorites: favoritesService,
      }}
    >
      <MyListComponent />
    </ContentListServerKibanaProvider>
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityName` | `string` | Yes | Singular entity name (e.g., "map") |
| `entityNamePlural` | `string` | Yes | Plural entity name (e.g., "maps") |
| `savedObjectType` | `string \| string[]` | Yes | Saved Object type(s) to search for |
| `services` | `object` | Yes | Kibana services (core, savedObjectsTagging, favorites) |
| `searchFieldsConfig` | `object` | No | Additional attributes to request |
| `features` | `ContentListFeatures` | No | Feature configuration |
| `transform` | `TransformFunction` | No | Custom transform for items |
| `isReadOnly` | `boolean` | No | Disable mutation actions |
| `queryKeyScope` | `string` | No | React Query cache key scope |

## How It Works

1. **Sends** search request to `/internal/content_management/list`
2. **Filters** by tags, users, and starred status (all server-side)
3. **Sorts** results server-side with runtime mappings for text fields
4. **Paginates** results server-side
5. **Enriches** items with user profile information from the response

## Server-Side Capabilities

The server strategy leverages `savedObjectsClient.search` which provides:

- Full Elasticsearch query DSL support
- Runtime mappings for sorting text fields without `.keyword` mappings
- Multi-type search across different saved object types
- Server-side starred item filtering
- User profile resolution included in response

## Related Packages

- [`@kbn/content-list-provider`](../kbn-content-list-provider) - Core provider and hooks
- [`@kbn/content-list-provider-client`](../kbn-content-list-provider-client) - Client-side strategy for smaller datasets
