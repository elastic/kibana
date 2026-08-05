/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dev-only entry point: regenerates `src/all_specs.ts`, `src/connector_icons_map.ts`, and the
 * per-connector ownership block in `.github/CODEOWNERS` from `src/specs/`, and validates the
 * structure (ordering, duplicate links) of `data-context-sources-connectors-list.md` and the
 * third-party connectors section of `docs/reference/toc.yml`. This is Node-only tooling (it
 * shells out to `fs`, `eslint`, `prettier`), kept out of the main `./index.ts`/`./icons.ts`
 * entry points because those are isomorphic and get bundled for the browser. Only import this
 * from other build/dev tooling (currently `@kbn/generate`'s `connector` and
 * `connector-registries` commands), never from application code.
 */
export {
  computeGeneratedFiles,
  computeConnectorRegistry,
  writeConnectorRegistries,
  validateConnectorDocsList,
  validateConnectorToc,
  validateConnectorIcons,
  CONNECTOR_DOCS_LIST_PATH,
  DOCS_TOC_PATH,
  REGENERATE_COMMAND,
  type ConnectorRegistryEntry,
  type GeneratedConnectorFile,
} from './scripts/generate_connector_registries';
