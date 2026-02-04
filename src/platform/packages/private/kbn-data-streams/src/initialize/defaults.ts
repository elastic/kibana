/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultsDeep } from 'lodash';
import type { AnyDataStreamDefinition, DataStreamDefinition } from '../types';

/**
 * Validates that the user-provided mappings do not contain reserved keys.
 * @throws Error if the mappings contain a reserved key.
 */
function validateMappings(def: AnyDataStreamDefinition): void {
  const properties = def.template?.mappings?.properties;
  if (!properties) {
    return;
  }

  if ('kibana' in properties) {
    throw new Error(
      `Data stream "${def.name}" contains reserved mapping key "kibana". ` +
        `This namespace is reserved for system properties.`
    );
  }

  if ('_id' in properties) {
    throw new Error(
      `Data stream "${def.name}" contains reserved mapping key "_id". ` +
        `This field is reserved for document identifiers.`
    );
  }
}

/**
 * Do not change these defaults lightly... They are applied to all data streams and may
 * result in a large number of updated data streams when this code is released.
 */
export function applyDefaults(def: AnyDataStreamDefinition): AnyDataStreamDefinition {
  // Validate that user mappings don't contain reserved keys
  validateMappings(def);

  const defaultDataStreamDefinition: Partial<DataStreamDefinition<any, any>> = {
    hidden: true,
    template: {
      priority: 100,
      _meta: {
        managed: true,
        userAgent: '@kbn/data-streams',
      },
      mappings: {
        dynamic: false,
        properties: {
          // System mapping for space support - injected into all data streams
          kibana: {
            properties: {
              space_ids: { type: 'keyword', ignore_above: 1024 },
            },
          },
        },
      },
      settings: {
        hidden: true,
      },
    },
  };

  // Avoid mutating the original definition
  return defaultsDeep({}, def, defaultDataStreamDefinition);
}
