/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultsDeep } from 'lodash';
import type api from '@elastic/elasticsearch/lib/api/types';
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

function getConfiguredIlmPolicyName(settings?: api.IndicesIndexSettings): string | undefined {
  if (!settings) {
    return undefined;
  }

  const settingsAsRecord = settings as Record<string, unknown>;
  const flattenedName = settingsAsRecord['index.lifecycle.name'];
  if (typeof flattenedName === 'string') {
    return flattenedName;
  }

  const lifecycle = settingsAsRecord.lifecycle;
  if (typeof lifecycle === 'object' && lifecycle !== null) {
    const lifecycleName = (lifecycle as Record<string, unknown>).name;
    if (typeof lifecycleName === 'string') {
      return lifecycleName;
    }
  }

  const flattenedLifecycle = settingsAsRecord['index.lifecycle'];
  if (typeof flattenedLifecycle === 'object' && flattenedLifecycle !== null) {
    const lifecycleName = (flattenedLifecycle as Record<string, unknown>).name;
    if (typeof lifecycleName === 'string') {
      return lifecycleName;
    }
  }

  return undefined;
}

function validateIlmPolicy(def: AnyDataStreamDefinition): void {
  if (!def.ilmPolicy) {
    return;
  }

  const configuredPolicyName = getConfiguredIlmPolicyName(def.template?.settings);
  if (configuredPolicyName && configuredPolicyName !== def.ilmPolicy.name) {
    throw new Error(
      `Data stream "${def.name}" has ILM policy "${def.ilmPolicy.name}" but template settings link to "${configuredPolicyName}". ` +
        `Please align these values.`
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
  validateIlmPolicy(def);

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
        ...(def.ilmPolicy ? { lifecycle: { name: def.ilmPolicy.name } } : {}),
      },
    },
  };

  // Avoid mutating the original definition
  return defaultsDeep({}, def, defaultDataStreamDefinition);
}
