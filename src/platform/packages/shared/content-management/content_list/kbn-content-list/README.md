# `@kbn/content-list`

Facade package for composing content list UIs from the provider and the common toolbar, table, footer, and empty-state building blocks.

Use this package when you want the simplest import path:

```ts
import {
  ContentList,
  ContentListProvider,
  ContentListToolbar,
  ContentListTable,
  ContentListFooter,
  ContentListEmptyState,
} from '@kbn/content-list';
```

The lower-level packages remain available for more focused use cases, while this package offers the migration-friendly default surface.

For standard Kibana listing pages, use `@kbn/content-list-page` alongside the
portable content-list primitives:

```tsx
import { KibanaContentListPage } from '@kbn/content-list-page';

<KibanaContentListPage>
  <KibanaContentListPage.Header title="Maps" actions={<CreateMapButton />} />
  <KibanaContentListPage.Section>
    <ContentList emptyState={<ContentListEmptyState />}>
      <ContentListToolbar />
      <ContentListTable title="Maps" />
      <ContentListFooter />
    </ContentList>
  </KibanaContentListPage.Section>
</KibanaContentListPage>
```

For custom page shells or tab bodies, keep the page chrome outside and compose
the list region directly:

```tsx
<DashboardUnsavedListing />
<ContentList emptyState={<ContentListEmptyState />}>
  <ContentListToolbar />
  <ContentListTable title="Dashboards" />
  <ContentListFooter />
</ContentList>
```
