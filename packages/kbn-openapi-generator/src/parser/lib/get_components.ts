/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  OpenApiDocument,
  OpenApiComponentsObject,
  OpenApiSchemasObject,
} from '../openapi_types';
import { extractByJsonPointer } from './helpers/extract_by_json_pointer';
import { findLocalRefs } from './helpers/find_local_refs';
import { parseRef } from './helpers/parse_ref';

/**
 * Returns document components.
 *
 * It performs topological sorting of component schemas to enable arbitrary
 * schemas definition order.
 */
export function getComponents(document: OpenApiDocument): OpenApiComponentsObject | undefined {
  if (document.components?.['x-codegen-enabled'] === false) {
    return undefined;
  }

  if (!document.components) {
    return;
  }

  const refsAdjList = buildLocalRefsAdjacencyList(document.components);
  const sortedSchemaRefs = sortTopologically(
    refsAdjList,
    Array.from(Object.keys(document.components?.schemas ?? {}))
  );
  // Starting from ES2020 functions returning or traversing object properties
  // make it in ascending chronological order of property creation. It makes
  // it possible to assemble schemas object which will be traversed in
  // the right order preserving topological sorting.
  const sortedSchemas: OpenApiSchemasObject = {};

  for (const schemaName of sortedSchemaRefs) {
    sortedSchemas[schemaName] = extractByJsonPointer(document, `/components/schemas/${schemaName}`);
  }

  return {
    ...document.components,
    schemas: sortedSchemas,
  };
}

/**
 * References adjacency list with keys as schema name and value
 * as a set of schemas the key references to.
 */
type ReferencesAdjacencyList = Map<string, Set<string>>;

/**
 * Builds a references adjacency list. An adjacency list allow to apply
 * any graph algorithms working with adjacency lists.
 * See https://en.wikipedia.org/wiki/Adjacency_list
 */
function buildLocalRefsAdjacencyList(
  componentsObj: OpenApiComponentsObject
): ReferencesAdjacencyList {
  if (!componentsObj.schemas) {
    return new Map();
  }

  const adjacencyList: ReferencesAdjacencyList = new Map();

  for (const [schemaName, schema] of Object.entries(componentsObj.schemas)) {
    const dependencies = adjacencyList.get(schemaName);
    const dependencySchemaNames = findLocalRefs(schema).map((ref) => parseRef(ref).schemaName);

    if (!dependencies) {
      adjacencyList.set(schemaName, new Set(dependencySchemaNames));
    } else {
      for (const dependencySchemaName of dependencySchemaNames) {
        dependencies.add(dependencySchemaName);
      }
    }
  }

  return adjacencyList;
}

/**
 * Sorts dependent references in topological order. Local dependencies are placed
 * before dependent schemas. External references aren't involved.
 * See https://en.wikipedia.org/wiki/Topological_sorting
 *
 * It uses Depth First Search (DFS) variant of topological sort to preserve schemas
 * definition order in OpenAPI specification document. Topological sorting doesn't
 * define any order for non dependent schemas. Preserving original ordering looks
 * like a good option to minimize diffs and have higher result predictability.
 *
 * @param adjacencyList An adjacency list, e.g. built via buildLocalRefsAdjacencyList
 * @param originalOrder A string array having schema names sorted in OpenAPI spec order
 * @returns A string array sorting in topological way
 */
function sortTopologically(
  adjacencyList: ReferencesAdjacencyList,
  originalOrder: string[]
): string[] {
  const sortedSchemas: string[] = [];
  const visited = new Set<string>();
  const addToSorted = (schemaName: string): void => {
    if (visited.has(schemaName)) {
      return;
    }

    visited.add(schemaName);

    for (const dependencySchemaName of adjacencyList.get(schemaName) ?? []) {
      addToSorted(dependencySchemaName);
    }

    sortedSchemas.push(schemaName);
  };

  for (const schemaName of originalOrder) {
    addToSorted(schemaName);
  }

  return sortedSchemas;
}
