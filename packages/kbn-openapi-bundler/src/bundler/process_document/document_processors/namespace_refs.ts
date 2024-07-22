/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractByJsonPointer } from '../../../utils/extract_by_json_pointer';
import { isPlainObjectType } from '../../../utils/is_plain_object_type';
import { parseRef } from '../../../utils/parse_ref';
import { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Creates a node processor to prefix possibly conflicting components and security requirements
 * with a string considered as a `namespace`. Namespace value is extracted from the document by
 * the provided JSON pointer.
 */
export function createNamespaceComponentsProcessor(pointer: string): DocumentNodeProcessor {
  let namespace = '';

  const prefixObjectKeys = (obj: Record<string, unknown>): void => {
    for (const name of Object.keys(obj)) {
      if (name.startsWith(namespace)) {
        continue;
      }

      obj[`${namespace}_${name}`] = obj[name];
      delete obj[name];
    }
  };

  return {
    onNodeEnter(node, context) {
      // Skip non root nodes and referenced documents
      if (!context.isRootNode || context.parentContext) {
        return;
      }

      const extractedNamespace = extractByJsonPointer(node, pointer);

      if (typeof extractedNamespace !== 'string' || extractedNamespace.trim() === '') {
        throw new Error(`"${pointer}" should resolve to a non empty string`);
      }

      namespace = normalizeNamespace(extractedNamespace);
    },
    onRefNodeLeave(node) {
      // It's enough to decorate the base name and actual object manipulation
      // will happen at bundling refs stage
      node.$ref = decorateRefBaseName(node.$ref, namespace);
    },
    // Items used in root level `security` values must match a scheme defined in the
    // `components.securitySchemes`. It means items in `security` implicitly reference
    // `components.securitySchemes` items which should be handled.
    onNodeLeave(node, context) {
      if (!context.isRootNode || !isPlainObjectType(node)) {
        return;
      }

      if (
        isPlainObjectType(node.components) &&
        isPlainObjectType(node.components.securitySchemes)
      ) {
        prefixObjectKeys(node.components.securitySchemes);
      }

      if (Array.isArray(node.security)) {
        for (const securityRequirements of node.security) {
          prefixObjectKeys(securityRequirements);
        }
      }
    },
  };
}

function decorateRefBaseName(ref: string, prefix: string): string {
  const { path, pointer } = parseRef(ref);
  const pointerParts = pointer.split('/');
  const refName = pointerParts.pop()!;

  if (refName.startsWith(prefix)) {
    return ref;
  }

  return `${path}#${pointerParts.join('/')}/${prefix}_${refName}`;
}

function normalizeNamespace(namespace: string): string {
  return namespace.replaceAll(/[\s.]/g, '_');
}
