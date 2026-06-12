# @kbn/esql

## Component properties
The editor accepts the following properties:
- query: This is the **AggregateQuery** query. i.e. (`{esql: from index1 | limit 10}`)
- onTextLangQueryChange: callback that is called every time the query is updated
- errors: array of `Error`.
- warning: A string for visualizing warnings
- onTextLangQuerySubmit: callback that is called when the user submits the query
- isLoading: As the editor is not responsible for the data fetching request, the consumer could update this property when the data are being fetched. If this property is defined, the query history component will be rendered
```

To use it on your application, you need to add the textBasedLanguages to your requiredBundles and the @kbn/esql to your tsconfig.json and use the component like that:
import { ESQLLangEditor } from '@kbn/esql/public';

 <ESQLLangEditor
  query={query}
  onTextLangQueryChange={onTextLangQueryChange}
  errors={props.textBasedLanguageModeErrors}
  isDisabled={false}
  onTextLangQuerySubmit={onTextLangQuerySubmit}
 />
```

## Usage so far
The ESQLEditor is currently part of the unified search component. 
If your application uses the dataview picker then it can be enabled by adding

```
textBasedLanguages: ['ESQL'],
```

om the dataViewPickerProps property.

It is also part of the:
- Lens inline editing component
- Maps new ES|QL layer
- ML data visualizer
- Alerts

## Plugin setup contract

The `esql` plugin exposes a setup contract (`EsqlPluginSetup`) that other plugins can use during their own setup lifecycle.

### `registerSourceEnricher(enricher)`

Register a function to enrich the list of ES|QL source autocomplete suggestions. Multiple plugins may register enrichers; they are chained in registration order.

**Signature:**

```ts
registerSourceEnricher(
  enricher: (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>
): void;
```

The enricher receives the current list of `ESQLSourceResult` objects and must return a (potentially modified) list. Each result can be augmented with:
- `title` – display label (overrides `name` in the suggestion list)
- `description` – markdown text shown in the autocomplete detail popup
- `links` – array of `{ label, url }` shown as links in the detail popup
- `type` – one of `SOURCES_TYPES.*` (e.g. `WIRED_STREAM`, `CLASSIC_STREAM`) for visual differentiation

**Example (plugin setup):**

```ts
setup(core, { esql }) {
  esql?.registerSourceEnricher(async (sources) => {
    return sources.map((source) => ({
      ...source,
      description: 'Custom description for ' + source.name,
    }));
  });
}
```

Add `esql` to your plugin's `optionalPlugins` list in `kibana.jsonc` and declare `esql?: EsqlPluginSetup` in your setup dependencies type.

## Want to add support for a new command?
Follow this [guide](ADD_COMMAND_GUIDE.md).
