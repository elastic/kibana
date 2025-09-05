/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identity } from 'lodash';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import type { EnhancementRegistryDefinition, EnhancementRegistryItem } from './types';

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

  /**
   * extracts references from enhancements state
   */
  public transformIn = (incomingState: { [key: string]: unknown }) => {
    const outputState: { [key: string]: unknown } = {};
    const extractedReferences: Reference[] = [];
    Object.keys(incomingState).forEach((key) => {
      if (!incomingState[key]) return;
      const enhancementStateManger = this.getEnhancement(key);
      const { state, references } = enhancementStateManger
        ? enhancementStateManger.extract(incomingState[key] as SerializableRecord)
        : { state: incomingState[key], references: [] };
      outputState[key] = state;
      extractedReferences.push(...references);
    });

    return {
      enhancementsState: outputState,
      enhancementsReferences: extractedReferences,
    };
  };

  /**
   * Injects enhancements state with references
   */
  public transformOut = (incomingState: { [key: string]: unknown }, references: Reference[]) => {
    const outputState: { [key: string]: unknown } = {};
    Object.keys(incomingState).forEach((key) => {
      if (!incomingState[key]) return;
      const enhancementStateManger = this.getEnhancement(key);
      outputState[key] = enhancementStateManger
        ? enhancementStateManger.inject(incomingState[key] as SerializableRecord, references)
        : incomingState[key];
    });

    return outputState;
  };
}
