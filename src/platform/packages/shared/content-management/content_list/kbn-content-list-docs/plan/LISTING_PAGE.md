# ContentListPage Component

## Document Purpose

This document specifies the `ContentListPage` component, an optional page-level wrapper that provides consistent layout patterns for content listing pages.

**Related Documents:**
- **[LISTING_COMPONENT.md](./LISTING_COMPONENT.md)** - Core list component specifications
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details
- **[RECIPES.md](./RECIPES.md)** - Usage examples
- **[PLAN.md](./PLAN.md)** - Implementation phases

---

## Overview

`ContentListPage` is an **optional** page-level wrapper component that provides a consistent layout structure for content list pages across Kibana. It uses `KibanaPageTemplate` patterns and provides slots for headers, tabs, and content sections.

**Key Points:**
- Optional - you can use `ContentListProvider` without it.
- Provides consistent page layout patterns.
- Handles breadcrumbs, headers, and tabs.
- Uses compound components for flexible composition.

---

## Component Hierarchy

```
ContentListPage (optional layout wrapper)
├── ContentListPage.Header
│   └── Header (title, description, actions, tabs)
│       ├── Header.Right (action buttons)
│       ├── Header.Bottom (bottom content)
│       └── Header.Tab (tab definitions)
└── ContentListPage.Section (content area)
    └── [Your content - typically ContentListProvider]
```

---

## Components

### ContentListPage

```tsx
interface ContentListPageProps {
  /** Standard Kibana page template props. */
  restrictWidth?: boolean | number;
  grow?: boolean;
  offset?: number;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  
  children: ReactNode;
}

ContentListPage.Header = ({ children }: { children: ReactNode }) => children;
ContentListPage.Section = ({ children }: { children: ReactNode }) => children;
```

**Usage:**

```tsx
<ContentListPage restrictWidth={1200}>
  <ContentListPage.Header>
    <Header title="Dashboards">
      <Header.Right>
        <EuiButton>Create dashboard</EuiButton>
      </Header.Right>
    </Header>
  </ContentListPage.Header>
  
  <ContentListPage.Section>
    {/* Your listing components */}
  </ContentListPage.Section>
</ContentListPage>
```

---

## Hooks

### useContentListPage

Access to ContentListPage context, primarily for tab state.

```tsx
import { useContentListPage } from '@kbn/content-list-page';

interface ContentListPageContext {
  activeTab?: string;
  setActiveTab: (tabId: string) => void;
}

function useContentListPage(): ContentListPageContext;
```

**Usage:**

```tsx
function CustomTabContent() {
  const { activeTab, setActiveTab } = useContentListPage();
  
  const switchToSettings = () => setActiveTab('settings');
  
  return <div>Current tab: {activeTab}</div>;
}
```

---

### Header

```tsx
interface HeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: EuiBreadcrumb[];
  initialTab?: string;
  children?: ReactNode;
}

Header.Right = ({ children }: { children: ReactNode }) => children;
Header.Bottom = ({ children }: { children: ReactNode }) => children;
Header.Tab = ({
  id: string;
  label: ReactNode;
  isDisabled?: boolean;
  children: ReactNode;
}) => children;
```

**Tab State Management:**

When using tabs, the `Header` component automatically:
- Manages active tab state internally.
- Syncs tab state to URL (query param: `tab=<id>`).
- Provides active tab via context.
- Only renders content for the active tab.

**Usage:**

```tsx
<Header title="Dashboards" description="Manage dashboards">
  <Header.Right>
    <EuiButton onClick={createDashboard}>Create dashboard</EuiButton>
    <EuiButton onClick={importDashboard}>Import</EuiButton>
  </Header.Right>
</Header>

// With tabs
<Header title="Visualize library" initialTab="visualizations">
  <Header.Tab id="visualizations" label="Visualizations">
    <VisualizationsContent />
  </Header.Tab>
  <Header.Tab id="lens" label="Lens">
    <LensContent />
  </Header.Tab>
  <Header.Tab id="maps" label="Maps">
    <MapsContent />
  </Header.Tab>
</Header>
```

---

## Complete Examples

### Simple Listing Page

```tsx
<ContentListPage>
  <ContentListPage.Header>
    <Header title="Dashboards" description="Create and manage dashboards">
      <Header.Right>
        <EuiButton iconType="plusInCircle" onClick={createDashboard}>
          Create dashboard
        </EuiButton>
      </Header.Right>
    </Header>
  </ContentListPage.Header>
  
  <ContentListPage.Section>
    <ContentListClientKibanaProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      savedObjectType="dashboard"
      savedObjectsTagging={savedObjectsTagging}
      core={core}
      features={{
        selection: { onSelectionDelete: deleteDashboards },
      }}
    >
      <ContentListToolbar />
      <ContentListTable />
    </ContentListClientKibanaProvider>
  </ContentListPage.Section>
</ContentListPage>
```

### Tabbed Listing Page

```tsx
<ContentListPage>
  <ContentListPage.Header>
    <Header title="Visualize library" initialTab="visualizations">
      <Header.Tab id="visualizations" label="Visualizations">
        <EuiCallOut title="Building a dashboard?" iconType="iInCircle">
          <p>Consider using Lens for most visualizations.</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        
        <ContentListClientKibanaProvider
          entityName="visualization"
          entityNamePlural="visualizations"
          savedObjectType="visualization"
          savedObjectsTagging={savedObjectsTagging}
          core={core}
          features={{
            selection: { onSelectionDelete: deleteItems },
            globalActions: { onCreate: createNewVis },
          }}
          item={{
            actions: { onEdit: editItem },
          }}
        >
          <ContentListToolbar />
          <ContentListTable />
        </ContentListClientKibanaProvider>
      </Header.Tab>
      
      <Header.Tab id="lens" label="Lens">
        <LensListingContent />
      </Header.Tab>
      
      {registryTabs.map(tab => (
        <Header.Tab key={tab.id} id={tab.id} label={tab.title}>
          <tab.Component />
        </Header.Tab>
      ))}
    </Header>
  </ContentListPage.Header>
</ContentListPage>
```

### Embedded Usage (No Page Wrapper)

You don't need `ContentListPage` - use providers directly:

```tsx
<EuiFlyout onClose={onClose}>
  <EuiFlyoutHeader>
    <EuiTitle><h2>Select an index pattern</h2></EuiTitle>
  </EuiFlyoutHeader>
  
  <EuiFlyoutBody>
    <ContentListProvider
      entityName="index pattern"
      entityNamePlural="index patterns"
      dataSource={{ findItems: findIndexPatterns }}
    >
      <ContentListToolbar />
      <ContentListTable />
    </ContentListProvider>
  </EuiFlyoutBody>
</EuiFlyout>
```

---

## When to Use ContentListPage

**Use `ContentListPage` when:**
- Building a full-page listing view.
- Need consistent page layout with Kibana standards.
- Want built-in breadcrumb and header support.
- Using tabs to organize multiple lists.

**Don't use `ContentListPage` when:**
- Embedding a list in a flyout, modal, or popover.
- Building a custom layout.
- Creating a dashboard widget.
- Need complete control over page structure.

---

## Integration with KibanaPageTemplate

`ContentListPage` is a wrapper around `KibanaPageTemplate` and respects its standard props:

- `restrictWidth` - Limit page width.
- `grow` - Allow content to grow.
- `paddingSize` - Control page padding.
- Breadcrumbs via `Header` component.
- Page header via `Header` component.

---

## See Also

- **[LISTING_COMPONENT.md](./LISTING_COMPONENT.md)** - ContentList components.
- **[reference/CURRENT_USAGE.md](./reference/CURRENT_USAGE.md)** - TableListView analysis.
