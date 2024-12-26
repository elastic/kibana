/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identity } from 'lodash';
import { SerializableRecord } from '@kbn/utility-types';
import { EnhancementRegistryDefinition, EnhancementRegistryItem } from './types';

export class EnhancementsRegistry {
  private registry: Map<string, EnhancementRegistryItem> = new Map();

  public registerEnhancement = (enhancement: EnhancementRegistryDefinition) => {
    if (this.registry.has(enhancement.id)) {
      throw new Error(`enhancement with id ${enhancement.id} already exists in the registry`);
    }
    this.registry.set(enhancement.id, {
      id: enhancement.id,
      telemetry: enhancement.telemetry || ((state, stats) => stats),
      inject: enhancement.inject || identity,
      extract:
        enhancement.extract ||
        ((state: SerializableRecord) => {
          return { state, references: [] };
        }),
      migrations: enhancement.migrations || {},
    });
  };

  public getEnhancements = (): EnhancementRegistryItem[] => {
    return Array.from(this.registry.values());
  };

  public getEnhancement = (id: string): EnhancementRegistryItem => {
    return (
      this.registry.get(id) || {
        id: 'unknown',
        telemetry: (state, stats) => stats,
        inject: identity,
        extract: (state: SerializableRecord) => {
          return { state, references: [] };
        },
        migrations: {},
      }
    );
  };
}
