/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectReference } from '../../../../core/types';
import { EmbeddableStateWithType } from '../types';
import { MigrateFunctionsObject } from '../../../kibana_utils/common';

export const telemetryBaseEmbeddableInput = (
  state: EmbeddableStateWithType,
  telemetryData: Record<string, any>
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
