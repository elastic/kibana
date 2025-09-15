# ES|QL Server Plugin

This directory contains the server-side components and API routes for the ES|QL plugin. It provides backend services that power various functionalities within the Kibana ES|QL editor and related features.

---

## Registered API Routes

The ES|QL server exposes the following internal API routes:

* **`/internal/esql/autocomplete/join/indices`**: Used by the ES|QL editor to retrieve a list of indices suitable for **`JOIN`** autocompletion.
* **`/internal/esql/autocomplete/timeseries/indices`**: Provides index suggestions specifically for **time-series analysis** contexts within the ES|QL editor.
* **`/internal/esql/autocomplete/inference_endpoints/{taskType}`**: This endpoint is used to fetch LLM inference endpoints by task type.
* **`/internal/esql_registry/extensions/{query}`**: This is the primary endpoint for fetching **registered ES|QL extensions**, which enhance the editor's capabilities by providing contextual suggestions.

---

## ES|QL Extensions Registry

The **ES|QL Extensions Registry** is a powerful mechanism that allows other Kibana plugins to seamlessly integrate and provide context-aware suggestions and capabilities directly within the ES|QL editor. By registering extensions, plugins can enhance the user's query writing experience.

Currently, we support the following type of extension:

* **Recommended Queries**: These queries are suggested to users in the ES|QL editor, particularly after the **`FROM <index_pattern>`** command. They guide users by offering relevant starting points or common analytical patterns for their selected data source.

* **Recommended Fields**: These are field suggestions presented to users based on the active index pattern in their ES|QL query. They help users discover relevant fields for their current data context, making it easier to build queries without prior knowledge of the dataset's schema.

The registry intelligently handles both exact index pattern matches (e.g., "logs-2023-10-01") and wildcard patterns (e.g., "logs*"). This ensures users receive comprehensive and contextually appropriate suggestions, whether they specify a precise index or a broad pattern. For instance, a recommended query registered for logs* will be suggested if the user's query uses FROM logs-2024-01-15.

**Note**: The registry will only return indices (remote or local) that exist in the instance.

**Important:**: Extensions registered through this mechanism are solution-specific. They are categorized by solution (e.g., 'es', 'oblt', 'security', 'chat') and are only visible when working within the context of that specific solution. Extensions are not displayed in classic or non-solution-based Kibana instances.

---

## Registering Extensions

Plugins can easily register their desired ES|QL extensions by adding a dependency on the ES|QL plugin's server-side setup.

Here's an example of how to register `recommendedQueries`:

- Add **esql** as a dependency on your kibana.jsonc file

- **Add `esql` plugin dependency** in your plugin's `setup` method:

    ```typescript
    import { PluginSetup as ESQLSetup } from '@kbn/esql/server';
    import { CoreSetup } from '@kbn/core/server'; // Assuming CoreSetup is needed

    interface SetupDeps {
      esql: ESQLSetup;
      // ... other dependencies
    }
    const solutionId: SolutionId = 'oblt'; // Or 'security', 'es', 'chat', etc.

    // Inside your plugin's `Plugin` class
    public setup(core: CoreSetup, { esql }: SetupDeps) {
        // --- Registering Recommended Queries ---
        const esqlExtensionsRegistry = esql.getExtensionsRegistry();
        esqlExtensionsRegistry.setRecommendedQueries(
          [
            {
              name: 'Logs count by log level',
              query: 'from logs* | STATS count(*) by log_level',
            },
            {
              name: 'Apache logs counts',
              query: 'from logs-apache_error | STATS count(*)',
            },
            {
              name: 'Another index, not logs',
              query: 'from movies | STATS count(*)',
            },
          ],
           solutionId
        );

        // --- Registering Recommended Fields ---
        esqlExtensionsRegistry.setRecommendedFields(
          [
            {
              name: 'log_level',
              pattern: 'logs*', // This field is relevant for any index starting with 'logs...'
            },
            {
              name: 'host.ip',
              pattern: 'logs-apache_error', // This field is specific to 'logs-apache_error'
            },
            {
              name: 'http.request.method',
              pattern: 'logs*',
            },
          ],
            solutionId
        );
        return {};
    }

---