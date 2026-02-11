---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/saved-objects.html
---

# Saved Objects [saved-objects]

`Saved Objects` allow {{kib}} plugins to use {{es}} like a primary database. Think of them as an Object Document Mapper for {{es}}. Once a plugin has registered one or more Saved Object types, the Saved Objects client can be used to query or perform create, read, update and delete operations on each type.

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

This documentation is organized into the following sections:

* [Structure](saved-objects/structure.md) — Main parts of a saved object type (name, index pattern, mappings, model versions) and the structure of a model version.
* [Create](saved-objects/create.md) — How to register a new saved object type, define mappings and references, and define the initial model version.
* [Update](saved-objects/update.md) — How to upgrade existing saved object types (legacy transition and new model versions).
* [Validate](saved-objects/validate.md) — Testing model versions, ensuring safe type changes, and troubleshooting.
* [Delete](saved-objects/delete.md) — Removing a Saved Object type.
* [Migrations](saved-objects/migrations.md) — How schema and mapping changes are rolled out on Classic stack (self-hosted, Elastic Cloud Hosted) and Serverless (Elastic Cloud Serverless).
