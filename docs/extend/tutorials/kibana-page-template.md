---
navigation_title: "Kibana Page Template"
description: "Page layout and no-data states with KibanaPageTemplate."
---

# Kibana Page Template

`KibanaPageTemplate` wraps [EuiPageTemplate](https://elastic.github.io/eui/#/templates/page-template) for Kibana page layout, empty content, and the no-data getting-started view.

Import it from `@kbn/shared-ux-page-kibana-template`. Use EUI's page-template props (`offset`, `restrictWidth`, `panelled`, sections) for the page body.

For the **route header** (title, tabs, back, app menu), use [App Header](https://github.com/elastic/kibana/blob/main/src/core/packages/chrome/app-header/README.md). Do not add new `KibanaPageTemplate.Header` or `pageHeader` consumers for that slot.

## Empty content

Use when the user has data but this page has nothing to show — nothing created yet, empty search, or missing permission. Render an `EuiEmptyPrompt` as the child:

```tsx
<KibanaPageTemplate>
  <EuiEmptyPrompt
    title={<h1>Dashboards</h1>}
    body="You don't have any dashboards yet."
    actions={
      <EuiButton fill iconType="plusInCircle">
        Create new dashboard
      </EuiButton>
    }
  />
</KibanaPageTemplate>
```

`isEmptyState` only converts a `pageHeader` into a prompt when there are no children. Prefer rendering `EuiEmptyPrompt` yourself.

## No data (`noDataConfig`)

Use when there are no indices or data views for this solution. `noDataConfig` replaces `pageHeader` and `children`. `solutionNav` still renders if present.

`noDataConfig` reads `addBasePath` and Fleet access from context. Wrap the template with `KibanaPageTemplateKibanaProvider` and pass `coreStart`. Without that provider, the no-data card throws.

`action` must have exactly one key. Use `elasticAgent` for the promoted "Add data" card. Leave the object empty so the card supplies the base-path-aware integrations browse URL. A second key renders nothing.

```tsx
import {
  KibanaPageTemplate,
  KibanaPageTemplateKibanaProvider,
} from '@kbn/shared-ux-page-kibana-template';

const hasData = checkForData();

<KibanaPageTemplateKibanaProvider coreStart={coreStart}>
  <KibanaPageTemplate
    noDataConfig={
      hasData
        ? undefined
        : {
            action: {
              elasticAgent: {},
            },
          }
    }
  >
    {/* ignored when noDataConfig is set */}
  </KibanaPageTemplate>
</KibanaPageTemplateKibanaProvider>
```
