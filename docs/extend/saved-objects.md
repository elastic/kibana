---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/saved-objects-service.html
---

# Saved Objects [saved-objects]

`Saved Objects` allow {{kib}} plugins to use {{es}} like a primary database. Think of them as an Object Document Mapper for {{es}}. Once a plugin has registered one or more **Saved Object types**, the Saved Objects client can be used to query or perform create, read, update and delete operations on each type.

**Terminology:** A **Saved Object type** is the schema and configuration that a plugin registers for a kind of document (name, mappings, model versions, etc.). **Saved Objects** are the document instances of that type stored in {{es}}. The sections below cover both how to define and evolve Saved Object **types** and how to perform CRUD on Saved Object instances via the Core service (see [Use](saved-objects/use.md)).

::::{note}
The Saved Objects service is available on server side. Client side services and APIs have been deprecated for some time and will be removed in the near future.
::::

By using Saved Objects your plugin can take advantage of the following features:

* Migrations can evolve your document's schema by transforming documents and ensuring that the field mappings on the index are always up to date.
* a [HTTP API](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-saved-objects) is automatically exposed for each type (unless `hidden=true` is specified).
* a Saved Objects client that can be used from both the server and the browser.
* Users can import or export Saved Objects using the Saved Objects management UI or the Saved Objects import/export API.
* By declaring `references`, an object's entire reference graph will be exported. This makes it easy for users to export e.g. a `dashboard` object and have all the `visualization` objects required to display the dashboard included in the export.
* When the X-Pack security and spaces plugins are enabled these transparently provide RBAC access control and the ability to organize Saved Objects into spaces.

:::::{important}
When integrating with saved objects via the Saved Objects import/export APIs or the deprecated Saved Objects HTTP CRUD APIs, preserve `coreMigrationVersion` and `typeMigrationVersion` when persisting raw saved object documents outside of Kibana (for example, in JSON/NDJSON files). These fields are required to retain forwards compatibility across Kibana versions as saved object types evolve.
:::::

This documentation is organized into the following sections:

* [Structure](saved-objects/structure.md) — Parts of a Saved Object type definition (name, index pattern, mappings, model versions) and the structure of a model version.
* [Create a type](saved-objects/create.md) — Register a new Saved Object type, define mappings and references, and define the initial model version.
* [Update a type](saved-objects/update.md) — Upgrade existing Saved Object types (legacy transition and new model versions).
* [Validate type changes](saved-objects/validate.md) — Test model versions, ensure safe type definition changes, and troubleshoot validation failures.
* [Delete a type](saved-objects/delete.md) — Remove a Saved Object type registration.
* [CRUD operations](saved-objects/use.md) — Perform CRUD on Saved Object instances via the Core service (create, get, find, update, delete). Do not use the deprecated HTTP API.
* [Export and import](saved-objects/export.md) — Exporting and importing Saved Object documents.
* [Share across spaces](saved-objects/share.md) — Sharing saved objects across spaces (namespace types, conversion, deep links, legacy URL aliases).
* [Migrations](saved-objects/migrations.md) — How type schema and mapping changes are rolled out on Classic stack and Serverless.
