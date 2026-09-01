# `@kbn/doc-links` — Kibana documentation links registry

This package is intended to be the single source of truth for every documentation URL used in the Kibana UI. Instead of hardcoding URLs in components, register them here and access them via `docLinks.links.<section>.<page>`.

When the docs site restructures or the base URL changes, you update one file instead of hunting through dozens of components.

## How to add new links

1. **Register the URLs** in [`src/get_doc_links.ts`](src/get_doc_links.ts). Add a new section or extend an existing one:

   ```ts
   myPlugin: {
     overview: `${ELASTIC_DOCS}path/to/overview`,
     gettingStarted: `${ELASTIC_DOCS}path/to/getting-started`,
   },
   ```

2. **Add the types** in [`src/types.ts`](src/types.ts). Add a matching `readonly` block under `DocLinks`:

   ```ts
   readonly myPlugin: {
     readonly overview: string;
     readonly gettingStarted: string;
   };
   ```

3. **Use them in your plugin**. Access via the `docLinks` core service:

   ```tsx
   const { docLinks } = useKibana().services;
   const link = docLinks.links.myPlugin.overview;
   ```

> [!IMPORTANT]
> Never hardcode documentation URLs in components. Always use this service so links stay maintainable.
