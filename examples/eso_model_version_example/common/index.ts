/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'esoModelVersionExample';

export {
  EXAMPLE_SAVED_OBJECT_TYPE,
  EsoModelVersionExampleTypeRegistration,
  type EsoModelVersionExample,
  type EsoModelVersionExampleOptions1,
  type EsoModelVersionExampleOptions2,
  type EsoModelVersionExampleSecretData,
} from './types/latest';

export { esoModelVersionExampleV1 } from './types';
export { esoModelVersionExampleV2 } from './types';
export { esoModelVersionExampleV3 } from './types';
