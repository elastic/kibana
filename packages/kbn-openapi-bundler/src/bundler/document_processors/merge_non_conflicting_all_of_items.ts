/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { isPlainObjectType } from '../../utils/is_plain_object_type';
import { DocumentNodeProcessor } from '../types';

export function createMergeNonConflictingAllOfItemsProcessor(): DocumentNodeProcessor {
  return {
    leave(allOfNode) {
      if (
        !('allOf' in allOfNode) ||
        !Array.isArray(allOfNode.allOf) ||
        !canMergeObjectSchemas(allOfNode.allOf)
      ) {
        return;
      }

      const mergedProperties = {} as Record<string, OpenAPIV3.SchemaObject>;
      const mergedRequired: string[] = [];

      for (let i = 0; i < allOfNode.allOf.length; ++i) {
        const node = allOfNode.allOf[i];

        if (!isObjectNode(node)) {
          continue;
        }

        Object.assign(mergedProperties, node.properties);

        for (const requiredField of node.required ?? []) {
          mergedRequired.push(requiredField);
        }

        allOfNode.allOf.splice(i--, 1);
      }

      allOfNode.allOf.unshift({
        type: 'object',
        properties: mergedProperties,
      });

      if (mergedRequired.length > 0) {
        allOfNode.allOf[0].required = mergedRequired;
      }
    },
  };
}

function canMergeObjectSchemas(schemas: OpenAPIV3.SchemaObject[]): boolean {
  const propNames = new Set<string>();
  let objectSchemasCounter = 1;

  for (let i = 0; i < schemas.length; ++i) {
    const node = schemas[i];

    if (!isObjectNode(node) || !isPlainObjectType(node.properties)) {
      continue;
    }

    if (getObjectSchemaExtraFieldNames(node).size > 0) {
      return false;
    }

    const nodePropNames = Object.keys(node.properties);

    for (const nodePropName of nodePropNames) {
      if (propNames.has(nodePropName)) {
        return false;
      }

      propNames.add(nodePropName);
    }

    objectSchemasCounter++;
  }

  return objectSchemasCounter > 1;
}

function getObjectSchemaExtraFieldNames(schema: OpenAPIV3.SchemaObject): Set<string> {
  return new Set(Object.keys(omit(schema, ['type', 'properties', 'required'])));
}

function isObjectNode(node: unknown): boolean {
  return isPlainObjectType(node) && node.type === 'object';
}
