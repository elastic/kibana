# `@kbn/content-list-page`

Kibana-specific page shell for standard content listing pages.

This package intentionally sits outside `@kbn/content-list` so the portable content-list facade can stay focused on the list-region building blocks. `KibanaContentListPage` is a thin wrapper over `KibanaPageTemplate` that wires up a shared heading `id` and `data-test-subj` for its compound children:

- **`KibanaContentListPage.Header`** — page title, description, and header actions.
- **`KibanaContentListPage.Section`** — a `KibanaPageTemplate.Section` with `aria-labelledby` pointing at the page heading by default.

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
