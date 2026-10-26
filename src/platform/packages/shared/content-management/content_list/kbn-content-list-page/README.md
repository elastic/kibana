# `@kbn/content-list-page`

Kibana-specific page shell for standard content listing pages.

This package intentionally sits outside `@kbn/content-list` so the portable content-list facade can stay focused on the list-region building blocks. `KibanaContentListPage` is a thin wrapper over `KibanaPageTemplate` that wires up a shared heading `id` and `data-test-subj` for its compound children:

- **`KibanaContentListPage.Header`** — page title, description, and header actions.
- **`KibanaContentListPage.Section`** — a labelled `KibanaPageTemplate.Section`. It is named by the page heading by default, or by `aria-label` when the heading is rendered elsewhere.
- **`KibanaContentListPage.ActiveTab`** — resolves and renders the content of the tab selected in the application's tab bar.

```tsx
import {
  ContentList,
  ContentListProvider,
  ContentListToolbar,
  ContentListTable,
  ContentListFooter,
} from '@kbn/content-list';
import { KibanaContentListPage } from '@kbn/content-list-page';

<ContentListProvider labels={labels} dataSource={dataSource}>
  <KibanaContentListPage>
    <KibanaContentListPage.Header title="Maps" actions={<CreateMapButton />} />
    <KibanaContentListPage.Section>
      <ContentList>
        <ContentListToolbar />
        <ContentListTable title="Maps" />
        <ContentListFooter />
      </ContentList>
    </KibanaContentListPage.Section>
  </KibanaContentListPage>
</ContentListProvider>;
```

Use multiple `Section` instances when you want distinct page bands (e.g., a filters strip above the list region).

## Tabbed listing pages

The application owns the tabs, routing, and error UI. In this case, `AppHeader` renders the tab bar. `ActiveTab` only resolves and renders the active tab's content.

```tsx
<AppHeader title="Dashboards" tabs={headerTabs} />
<KibanaContentListPage>
  <KibanaContentListPage.Section aria-label="Dashboards">
    <KibanaSectionErrorBoundary key={activeTabId} sectionName="Dashboards">
      <KibanaContentListPage.ActiveTab tabs={tabs} activeTabId={activeTabId} />
    </KibanaSectionErrorBoundary>
  </KibanaContentListPage.Section>
</KibanaContentListPage>
```

- Use `render` for immediately available content; it runs during render. Use `load` for asynchronous setup; it runs after activation and shows the fallback until it settles.
- Keep each async tab's `load` function stable, typically by defining or memoizing the tab definitions; replacing it starts a new load.
- Errors are rethrown to the nearest error boundary. Key it by `activeTabId` so switching tabs clears the error.
- `aria-label` takes precedence over `aria-labelledby`, so only one naming attribute is ever rendered.

See the **Content List / Tabbed Listing** story for a working example.
