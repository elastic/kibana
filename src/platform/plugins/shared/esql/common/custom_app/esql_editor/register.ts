/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerCapability, type CapabilityViewLoader } from '@kbn/custom-app-registry';
import { esqlEditorCapability } from './manifest';

/** Adds the ES|QL editor to what custom apps can be made of. The browser also says how to draw it. */
export const registerEsqlEditorCapability = (view?: CapabilityViewLoader): void =>
  registerCapability(esqlEditorCapability, view);
