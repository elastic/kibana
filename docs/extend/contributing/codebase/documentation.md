---
navigation_title: "Documentation"
description: "Writing documentation during development"
---

# Documentation

Docs should be written during development and accompany PRs when relevant. There are multiple types of documentation, and different places to add each.

## End-user documentation

User-facing features are documented in Markdown under [docs/](https://github.com/elastic/kibana/tree/main/docs) and published to [elastic.co/docs](https://www.elastic.co/docs) via the [Elastic Docs v3](https://www.elastic.co/docs/contribute-docs) system. Authoring and syntax guidance lives in the [contributor docs](https://www.elastic.co/docs/contribute-docs), and the tooling itself is documented at [elastic.github.io/docs-builder](https://elastic.github.io/docs-builder/).

To preview docs locally, install `docs-builder` and run it from the Kibana repo root.

Install:

```bash
curl -sL https://ela.st/docs-builder-install | sh
```

Run a one-off build to surface warnings and errors:

```bash
docs-builder
```

Start a live-preview server at [http://localhost:3000](http://localhost:3000):

```bash
docs-builder serve
```

When you add, change, deprecate, or remove a `kibana.yml` setting or an Advanced Settings (`uiSettings`) entry, document it in the `{settings}` YAML under `docs/reference/`. Follow [`.agents/skills/kibana-settings-docs/SKILL.md`](../../../../.agents/skills/kibana-settings-docs/SKILL.md) for file choice, YAML syntax, and `applies_to` checks.

## REST APIs

REST APIs are documented via OpenAPI Spec (OAS) generated directly from the route registration code. Define your route schemas with `@kbn/config-schema` or `@kbn/zod`, and the generated OAS will flow through `scripts/capture_oas_snapshot.js` into the published bundles at [elastic.co/docs/api/doc/kibana](https://www.elastic.co/docs/api/doc/kibana/) (ESS) and [elastic.co/docs/api/doc/serverless](https://www.elastic.co/docs/api/doc/serverless/) (Serverless).

Start here:

- [Generating OAS for HTTP APIs](../../tutorials/generating-oas-for-http-apis.md) — how to register routes, attach schemas and examples, capture the OAS snapshot, and get your path included in the published bundle.
- [Guidelines for HTTP API design in Kibana](../api-design/guidelines-for-http-api-design-in-kibana.md) — schema patterns that produce clean OAS, plus documentation, security, and versioning requirements for public APIs.

## Developer documentation

Developer documentation can be segmented into two types: internal plugin details, and information on extending Kibana. This guide is meant to serve the latter.

Internal plugin details can be kept alongside the code it describes. Information about extending Kibana may go in the root of your plugin or package folder.

### Structure

The high-level developer documentation located in the [docs/extend](https://github.com/elastic/kibana/tree/main/docs/extend) folder attempts to follow [divio documentation](https://documentation.divio.com/) guidance. [Getting started](../../getting-started/index.md) and [Key concepts](../../key-concepts/index.md) sections are _explanation_ oriented, while
[Tutorials](../../tutorials/index.md) falls under both _tutorials_ and _how to_.

Developers may choose to keep information that is specific to a particular plugin or package alongside the code.

### Best practices

#### Keep content fresh

A fresh pair of eyes are invaluable. Recruit new hires to read, review and update documentation. Leads should also periodically review documentation to ensure it stays up to date. File issues any time you notice documentation is outdated.

#### Consider your target audience

Documentation in the Kibana Developer Guide is targeted towards developers building Kibana plugins. Keep implementation details about internal plugin code out of these docs.

#### High to low level

When a developer first lands in our docs, think about their journey. Introduce basic concepts before diving into details. The left navigation should be set up so documents on top are higher level than documents near the bottom.

#### Think outside-in

It's easy to forget what it felt like to first write code in Kibana, but do your best to frame these docs "outside-in". Don't use esoteric, internal language unless a definition is documented and linked. The fresh eyes of a new hire can be a great asset.

### Code comments

Every function, class, interface, type, parameter and property that is exposed to other plugins should have a [TSDoc](https://tsdoc.org/)-style comment.

- Use `@param` tags for every function parameter.
- Use `@returns` tags for return types.
- Use `@throws` when appropriate.
- Use `@beta` or `@deprecated` when appropriate.
- Use `@removeBy {version}` on `@deprecated` APIs. The version should be the last version the API will work in. For example, `@removeBy 7.15` means the API will be removed in 7.16. This lets us avoid mid-release cycle coordination. The API can be removed as soon as the 7.15 branch is cut.
- Use `@internal` to indicate this API item is intended for internal use only, which will also remove it from the docs.

### Interfaces vs inlined types

Prefer types and interfaces over complex inline objects. For example, prefer:

```ts
/**
* The SearchSpec interface contains settings for creating a new SearchService, like
* username and password.
*/
export interface SearchSpec {
 /**
  * Stores the username. Duh,
  */
 username: string;
 /**
  * Stores the password. I hope it's encrypted!
  */
 password: string;
}

 /**
  * Retrieve search services
  * @param searchSpec Configuration information for initializing the search service.
  * @returns the id of the search service
  */
export getSearchService: (searchSpec: SearchSpec) => string;
```

over:

```ts
/**
  * Retrieve search services
  * @param searchSpec Configuration information for initializing the search service.
  * @returns the id of the search service
  */
export getSearchService: (searchSpec: { username: string; password: string }) => string;
```

In the former, consumers can navigate to the `SearchSpec` interface and read the documentation for the `username` and `password` properties. In the latter the object is inlined, without comments.

### Export every type used in a public API

When a publicly exported API item references a private type, consumers cannot import or extend that type. The private type is, by proxy, part of your public API, and as such, should be exported.

Do:

```ts
export interface AnInterface { bar: string };
export type foo: string | AnInterface;
```

Don't:

```ts
interface AnInterface { bar: string };
export type foo: string | AnInterface;
```

### Avoid “Pick”

`Pick` and other similarly complex types are of limited help in your IDE, so avoid them on your public API items. Using these semantics internally is fine.

## Example plugins

Running Kibana with `yarn start --run-examples` will include all [example plugins](https://github.com/elastic/kibana/tree/main/examples). These are tested examples of platform services in use. We strongly encourage anyone providing a platform level service or [building block](../../key-concepts/ui/building-blocks.md) to include a tutorial that links to a tested example plugin. This is better than relying on copied code snippets, which can quickly get out of date.