/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { EmbeddableStateWithType } from '../types';

export const telemetryBaseEmbeddableInput = (
  state: EmbeddableStateWithType,
  telemetryData: Record<string, string | number | boolean>
) => {
  return telemetryData;
};

export const extractBaseEmbeddableInput = (state: EmbeddableStateWithType) => {
  return { state, references: [] as SavedObjectReference[] };
};

export const injectBaseEmbeddableInput = (
  state: EmbeddableStateWithType,
  references: SavedObjectReference[]
) => {
  return state;
};

export const baseEmbeddableMigrations: MigrateFunctionsObject = {};
