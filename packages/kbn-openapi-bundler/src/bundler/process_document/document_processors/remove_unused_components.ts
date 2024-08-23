/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseRef } from '../../../utils/parse_ref';
import { isPlainObjectType } from '../../../utils/is_plain_object_type';
import { DocumentNode, PlainObjectNode, RefNode } from '../types/node';
import { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Helps to remove unused components.
 *
 * To achieve it requires including in document processors list to collect encountered refs
 * and then `removeUnusedComponents()` should be invoked after document processing to perform
 * actual unused components deletion.
 */
export class RemoveUnusedComponentsProcessor implements DocumentNodeProcessor {
  private refs = new Set();

  onRefNodeLeave(node: RefNode): void {
    // Ref pointer might be modified by previous processors
    // resolvedRef.pointer always has the original value
    // while node.$ref might have updated
    const currentRefPointer = parseRef(node.$ref).pointer;

    this.refs.add(currentRefPointer);
  }

  // `security` entries implicitly refer security schemas
  onNodeLeave(node: DocumentNode): void {
    if (!hasSecurityRequirements(node)) {
      return;
    }

    for (const securityRequirementObj of node.security) {
      if (!isPlainObjectType(securityRequirementObj)) {
        continue;
      }

      for (const securityRequirementName of Object.keys(securityRequirementObj)) {
        this.refs.add(`/components/securitySchemes/${securityRequirementName}`);
      }
    }
  }

  removeUnusedComponents(components: PlainObjectNode): void {
    for (const collectionName of COMPONENTS_TO_CLEAN) {
      const objectsCollection = components?.[collectionName];

      if (!isPlainObjectType(objectsCollection)) {
        continue;
      }

      for (const schema of Object.keys(objectsCollection)) {
        if (!this.refs.has(`/components/${collectionName}/${schema}`)) {
          delete objectsCollection[schema];
        }
      }
    }
  }
}

function hasSecurityRequirements(node: DocumentNode): node is { security: unknown[] } {
  return 'security' in node && Array.isArray(node.security);
}

const COMPONENTS_TO_CLEAN = [
  'schemas',
  'responses',
  'parameters',
  'examples',
  'requestBodies',
  'headers',
  'securitySchemes',
  'links',
  'callbacks',
];
