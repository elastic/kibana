/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { ROLLOUT_GATE_SO_TYPE } from '../lib/constants';
import { rolloutGateMappings } from './mappings';
import { rolloutGateModelVersions } from './model_versions/rollout_gate_model_versions';

/**
 * One document per declared gate, plus one `genesis` document — see
 * `../lib/constants.ts`. Registered unconditionally in every environment (Serverless,
 * ECH, on-prem) per the Saved Objects type-registration rule, even though documents are
 * only ever created on Serverless; see `RolloutGatesService`.
 */
export const rolloutGateType: SavedObjectsType = {
  name: ROLLOUT_GATE_SO_TYPE,
  namespaceType: 'agnostic',
  hidden: true,
  mappings: rolloutGateMappings,
  modelVersions: rolloutGateModelVersions,
};
