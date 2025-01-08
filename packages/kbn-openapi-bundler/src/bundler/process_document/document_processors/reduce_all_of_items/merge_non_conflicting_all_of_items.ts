/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { OpenAPIV3 } from 'openapi-types';
import { isPlainObjectType } from '../../../../utils/is_plain_object_type';
import { DocumentNodeProcessor } from '../types/document_node_processor';

type MergedObjectSchema = Required<Pick<OpenAPIV3.SchemaObject, 'type' | 'properties'>> &
  Pick<OpenAPIV3.SchemaObject, 'required'>;

/**
 * Creates a node processor to merge object schema definitions when there are no conflicts
 * between them.
 *
 * After inlining references or any other transformations a schema may have `allOf`
 * with multiple object schema items. Object schema has `properties` field describing object
 * properties and optional `required` field to say which object properties are not optional.
 *
 * Conflicts between object schemas do now allow merge them. The following conflicts may appear
 *
 * - Two or more object schemas define the same named object field but definition is different
 * - Some of object schemas have optional properties like `readOnly`
 * - Two or more object schemas have conflicting optional properties values
 *
 * Example:
 *
 * The following `allOf` containing multiple object schemas
 *
 * ```yaml
 * allOf:
 *   - type: object
 *     properties:
 *       fieldA:
 *         $ref: '#/components/schemas/FieldA'
 *   - type: object
 *     properties:
 *       fieldB:
 *         type: string
 * ```
 *
 * will be transformed to
 *
 * ```yaml
 * allOf:
 *   - type: object
 *     properties:
 *       fieldA:
 *         $ref: '#/components/schemas/FieldA'
 *       fieldB:
 *         type: string
 * ```
 */
export function createMergeNonConflictingAllOfItemsProcessor(): DocumentNodeProcessor {
  return {
    onNodeLeave(allOfNode) {
      if (
        !('allOf' in allOfNode) ||
        !Array.isArray(allOfNode.allOf) ||
        !canMergeObjectSchemas(allOfNode.allOf)
      ) {
        return;
      }

      const resultItems: [
        MergedObjectSchema,
        ...Array<OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
      ] = [
        {
          type: 'object',
          properties: {},
        },
      ];
      const mergedRequired = new Set<string>();

      for (const item of allOfNode.allOf) {
        if (!isObjectNode(item) || !isPlainObjectType(item.properties)) {
          resultItems.push(item);
          continue;
        }

        Object.assign(resultItems[0].properties, item.properties);

        for (const requiredField of item.required ?? []) {
          mergedRequired.add(requiredField);
        }
      }

      if (mergedRequired.size > 0) {
        resultItems[0].required = Array.from(mergedRequired);
      }

      allOfNode.allOf = resultItems;
    },
  };
}

/**
 * Object schemas can be merged when
 *
 * - as minimum there are two object schemas
 * - object schemas DO NOT contain conflicting fields (same name but different definition)
 * - object schemas DO NOT contain fields besides `type`, `properties` and `required`
 *
 */
function canMergeObjectSchemas(schemas: OpenAPIV3.SchemaObject[]): boolean {
  const props = new Map<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>();
  let objectSchemasCounter = 0;

  for (const node of schemas) {
    if (!isObjectNode(node) || !isPlainObjectType(node.properties)) {
      continue;
    }

    if (getObjectSchemaExtraFieldNames(node).size > 0) {
      return false;
    }

    const nodePropNames = Object.keys(node.properties);

    for (const nodePropName of nodePropNames) {
      const propSchema = props.get(nodePropName);

      if (propSchema && !deepEqual(propSchema, node.properties[nodePropName])) {
        return false;
      }

      props.set(nodePropName, node.properties[nodePropName]);
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
