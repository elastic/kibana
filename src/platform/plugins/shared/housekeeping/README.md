# Housekeeping

Housekeeping finds what is broken or forgotten in the configuration of a cluster:

- **Broken references**: a resource points at something that doesn't exist, such as an index template with a default pipeline that was deleted.
- **Deprecations**: something that stops working in the next major version, such as an index that must be reindexed before the upgrade.
- **Risks**: a configuration that works today but may cause trouble later, such as a data stream without retention.
- **Unused resources**: a resource that nothing uses, such as a component template that no index template composes.

Housekeeping doesn't know about any resource itself. Each plugin registers the resources it owns and what they point at, and the checks that only it can run. Housekeeping builds a graph from every plugin, reports what it finds, and shows it in Stack Management and in a flyout that any app can open.

Plugins only share resource type ids. A plugin that points at a resource type owned by another plugin doesn't import anything from it.

## Enable Housekeeping

Housekeeping is off by default. Turn it on in `kibana.yml`, or in `config/kibana.dev.yml` for development:

```yaml
housekeeping.enabled: true
```

When it is off, Kibana doesn't load the plugin: there is no page, no menu item and no routes, and the plugins that register providers skip it because their dependency on `housekeeping` is optional.

Like Upgrade Assistant, Housekeeping is for cluster administrators: it needs the `manage` cluster privilege. The findings are read with the privileges of the current user.

## How it works

1. **Resource providers** list the resources of their types and the references from each resource to others.
2. **The reference graph** joins every provider. A reference to a resource that doesn't exist is a broken reference. A resource of a type with `unused` that nothing points at, and that has no other evidence of use, is unused.
3. **Checks** report risks, or anything else that isn't a reference between resources.
4. **The findings route** runs providers and checks with the Elasticsearch client of the current user, groups the findings by problem and returns them ready to render. The UI only renders what the route returns.

Providers and checks that fail or time out (30 seconds) don't stop the rest. They show up as "Not checked", and unused resources of the types they point at are not reported, because they can't be told apart from used ones.

## Onboard your plugin

### 1. Add the optional dependency

In `kibana.jsonc`:

```jsonc
"optionalPlugins": ["housekeeping"]
```

In `tsconfig.json`, add `"@kbn/housekeeping-plugin"` to `kbn_references`, and add the contracts to the setup and start dependencies of your plugin:

```ts
import type { HousekeepingServerSetup } from '@kbn/housekeeping-plugin/server';
import type { HousekeepingPublicStart } from '@kbn/housekeeping-plugin/public';

housekeeping?: HousekeepingServerSetup; // server setup dependencies
housekeeping?: HousekeepingPublicStart; // public start dependencies
```

### 2. Register a resource provider

Register providers in the `setup` of your server plugin:

```ts
public setup(core: CoreSetup, { housekeeping }: SetupDependencies) {
  housekeeping?.registerResourceProvider(pipelineResourceProvider);
}
```

A provider declares its resource types and lists its resources:

```ts
import type { HousekeepingResourceProvider } from '@kbn/housekeeping-plugin/server';

export const pipelineResourceProvider: HousekeepingResourceProvider = {
  id: 'ingest_pipelines',
  title: i18n.translate('xpack.ingestPipelines.housekeeping.providerTitle', {
    defaultMessage: 'Ingest Pipelines',
  }),
  resourceTypes: [
    {
      id: 'ingest_pipeline',
      label: i18n.translate('xpack.ingestPipelines.housekeeping.pipelineLabel', {
        defaultMessage: 'Ingest pipeline',
      }),
      // Where your app shows a resource. The UI links each finding to it.
      locator: {
        id: INGEST_PIPELINES_APP_LOCATOR,
        getParams: (name) => ({ page: 'pipeline_list', pipelineId: name }),
      },
      // The definition of a resource, attached when the user asks the AI Agent about it.
      describe: async (name, { esClient, abortSignal }) =>
        (await esClient.ingest.getPipeline({ id: name }, { signal: abortSignal }))[name],
      // Only for types whose unused resources are worth removing.
      unused: {
        message: i18n.translate('xpack.ingestPipelines.housekeeping.unusedMessage', {
          defaultMessage: 'No index, template or other pipeline uses this pipeline.',
        }),
        getFix: (name) => ({
          description: i18n.translate('xpack.ingestPipelines.housekeeping.deleteFix', {
            defaultMessage: 'Deletes the pipeline. Check that no client sends documents to it first.',
          }),
          request: `DELETE _ingest/pipeline/${name}`,
        }),
      },
    },
  ],
  // Types of other plugins that your resources point at.
  referencedTypes: ['enrich_policy'],
  isAvailable: ({ isServerless }) => true,

  async listResources({ esClient, abortSignal }) {
    const pipelines = await esClient.ingest.getPipeline({}, { signal: abortSignal });
    return Object.entries(pipelines).map(([name, pipeline]) => ({
      type: 'ingest_pipeline',
      id: name,
      isManaged: pipeline._meta?.managed === true,
      references: getProcessors(pipeline).flatMap((processor) =>
        processor.pipeline
          ? [
              {
                targetType: 'ingest_pipeline',
                targetId: processor.pipeline.name,
                via: 'pipeline processor',
                impact: i18n.translate('xpack.ingestPipelines.housekeeping.missingPipelineImpact', {
                  defaultMessage: 'Documents that reach this processor fail.',
                }),
              },
            ]
          : []
      ),
    }));
  },
};
```

What each field does:

| Field | Purpose |
| --- | --- |
| `resourceTypes[].id` | The id other plugins use to point at your resources. Use `snake_case` and don't change it once others use it. |
| `resourceTypes[].label` | The name of the type in the list and the filters. Types that are the same for the user share a label, such as legacy and composable index templates. |
| `resourceTypes[].locator` | Opens the resource in your app. Without it, the finding has no link. |
| `resourceTypes[].describe` | Returns the definition of a resource for the AI Agent. Keep it to what helps fix the finding. |
| `resourceTypes[].unused` | Reports resources of the type that nothing points at, with an optional fix. |
| `referencedTypes` | Types your resources point at. A run scoped to those types includes your provider, and unused resources of those types are not reported when your provider fails. |
| `isAvailable` | Leaves the provider out where it can't run, such as in serverless. |
| `listResources` | Returns your resources, or `{ resources, unusedNotChecked }` when some types can't be judged as unused in this run. |

Each resource can have:

| Field | Purpose |
| --- | --- |
| `references` | What the resource points at: `targetType`, `targetId`, `via` (the setting or field, such as `index.default_pipeline`), `impact` (what breaks when the target doesn't exist) and `optional` (counts as a use, but isn't broken when the target is missing). |
| `isManaged` | Set it for resources managed by Elastic, Fleet or the system, such as those with `_meta.managed` or whose name starts with a dot. Housekeeping never reports findings on them. |
| `inUse` | Evidence of use that references can't show, such as documents processed by a pipeline. |
| `details` | Facts shown under the resource name, written as full sentences. |
| `evidence` | Anything that helps the AI Agent, such as usage counters. It isn't shown in the list. |

### 3. Register checks

Checks report anything that isn't a reference between resources. They are risks unless they set another `kind`.

```ts
import type { HousekeepingCheck } from '@kbn/housekeeping-plugin/server';

export const readOnlyIndexCheck: HousekeepingCheck = {
  id: 'index_management.read_only_index',
  title: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.title', {
    defaultMessage: 'Indices blocked for writes',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.description', {
    defaultMessage: 'Elasticsearch rejects the documents sent to these indices.',
  }),
  resourceTypes: ['index'],
  async run({ esClient, abortSignal }) {
    const settings = await esClient.indices.getSettings(
      { name: READ_ONLY_BLOCK, flat_settings: true },
      { signal: abortSignal }
    );
    return Object.entries(settings)
      .filter(([, { settings: values }]) => String(values?.[READ_ONLY_BLOCK]) === 'true')
      .map(([index]) => ({
        resource: { type: 'index', id: index, isManaged: index.startsWith('.') },
        related: [],
        details: [
          i18n.translate('xpack.idxMgmt.housekeeping.readOnly.detail', {
            defaultMessage: '{setting} is set to true.',
            values: { setting: READ_ONLY_BLOCK },
          }),
        ],
        fix: {
          description: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.fix', {
            defaultMessage: 'Removes the block. Free disk space first, or Elasticsearch adds it again.',
          }),
          request: `PUT ${index}/_settings\n${JSON.stringify({ [READ_ONLY_BLOCK]: null }, null, 2)}`,
        },
      }));
  },
};

housekeeping?.registerCheck(readOnlyIndexCheck);
```

`resourceTypes` tells which scoped runs include the check. Every finding of a check is shown under its `title`, with its `description` behind the info icon.

A kind only shows in the UI when a provider or check of the run can report it. A finding can also have a `severity`, `critical` or `warning`, shown in its own column when a finding in the list has one.

#### Fixes with their own UI

When a fix needs more than one request, such as reindexing with progress, the finding lists `actions` and the plugin that owns it registers their UI in its public `setup`:

```ts
housekeeping?.registerFindingAction({
  id: 'upgrade_assistant.reindex',
  label: i18n.translate('xpack.upgradeAssistant.housekeeping.reindexAction', {
    defaultMessage: 'Reindex',
  }),
  iconType: 'indexSettings',
  run: (finding) => openReindexFlyout(finding),
});
```

Each action of a finding becomes a button in its row. Housekeeping removes the mask of its flyout before `run`, so the flyout that the plugin opens can take the focus.

### 4. Add Housekeeping to your app

Add the menu item to the `AppHeader` of your app. It opens the flyout with the findings of your types:

```tsx
<AppHeader
  title={title}
  menu={
    housekeeping
      ? { items: [housekeeping.getAppMenuItem({ resourceTypes: ['ingest_pipeline'] })] }
      : undefined
  }
/>
```

The public contract also has:

- `openHousekeepingFlyout(scope)`, to open the flyout from anywhere else.
- `HousekeepingFindings`, to embed the findings in a page, such as the details of a resource: `<HousekeepingFindings scope={{ resourceTypes: ['data_stream'], resourceId: name }} />`.

A scope includes the findings where the resource, or a resource it points at, matches the scope.

## Guidelines

- **Be sure.** Report a resource as unused only when nothing in the cluster can use it. When you can't tell, use `inUse`, mark the reference as `optional`, or return `unusedNotChecked`.
- **Read with the user's client.** The context gives an Elasticsearch client scoped to the current user, so the findings respect their privileges. A missing privilege makes your provider or check show as "Not checked".
- **Use only the clients of the context.** The routes rely on the privileges of the current user, so providers and checks must use the `esClient` and `savedObjectsClient` they receive, never an internal user. `describe` returns definitions as they are, so it must not read anything the user can't.
- **Share requests.** Use `fetchOnce(key, (abortSignal) => fetch(abortSignal))` from the context when several providers or checks need the same response. Pass the request the signal that `fetchOnce` gives you, not the one of your context: the request is shared, so it must not stop when your provider or check times out.
- **Write for people.** `details`, `message` and `impact` are full sentences, without codes or shorthand. The AI Agent reads them too.
- **Suggest fixes only when they don't need judgement.** A fix is a request in Console syntax that the user reviews before running it. For retention, suggest the data stream lifecycle. For anything that needs judgement, the AI Agent helps the user from the facts you give it.
- **Mind serverless.** Use `isAvailable` for APIs that serverless doesn't have, such as ILM or snapshots.

## Test your integration

- Unit test `listResources` and `run` with `elasticsearchServiceMock.createElasticsearchClient()`, as the providers in Index Management, Ingest Pipelines, Index Lifecycle Management and Snapshot and Restore do.
- In Kibana, open **Stack Management > Housekeeping**, or the menu item in your app. **Run checks again** runs everything without the cache.
- See how your findings look in Storybook, without a cluster (next section).

## Test the components in Storybook

Every component of the UI has stories, so you can review it without Kibana or a cluster.

1. Start Storybook from the root of the repository:

   ```sh
   node scripts/storybook housekeeping
   ```

   The first build takes a few minutes. When it prints `Storybook started`, open http://localhost:9001.

2. Open the stories under **Housekeeping**:

   | Stories | What they show |
   | --- | --- |
   | Findings panel | The whole page: loading, findings, skipped checks, nothing found, and failed requests. |
   | Flyout | The flyout that apps open from their header, including the scoped version with the link to the full report. |
   | Findings table | The list with its filters, the counts of each kind, and the actions of each row. `Many rows` shows the pagination. |
   | Fix panel | The fix of a finding, with the embedded Console, Console in a new tab, and without Console. |
   | Summary panel, Skipped checks popover | The meta blocks of the header. |
   | Resource, Finding kind | The badges of resource types and kinds of finding. |

3. Interact with them. Clicks on links, **Fix**, **Open in Console** and **Ask AI Agent** show up in the **Actions** tab instead of navigating. Use the toolbar to switch between the light and dark themes and to try narrow viewports: the list changes to its compact layout below 900 pixels.

Stories get everything Kibana would provide from the `withResourceTypes` decorator in `public/components/__stories__/decorators.tsx`: the labels of resource types, links to resources, the AI Agent, Console, and the parts of core that the content list reads. Add it to any new story of a component that renders findings; without it, the list renders nothing.

To see the findings of your plugin, add them to `public/components/__stories__/fixtures.ts`:

1. Add the labels of your resource types to `resourceTypes`.
2. Add a `HousekeepingFindingGroup` with your findings, as your provider or check would return them, with their `details`, `message` and `fix`.
3. Use the group in a story, such as a new one in `findings_table.stories.tsx`:

   ```ts
   export const SnapshotPolicies: Story = { args: { groups: [failingSnapshotPolicies] } };
   ```

Before you open a pull request, check that every story renders without errors in the browser console.

## HTTP API

Internal routes, used by the UI:

- `GET /internal/housekeeping/findings?resourceType=<type>&resourceId=<id>`: the findings, grouped and filtered by scope. `resourceType` can repeat.
- `GET /internal/housekeeping/resources/{type}/{id}`: the definition of a resource, from the `describe` of its type.
