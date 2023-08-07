/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

export const AUTOCOMPLETE_DEFINITIONS_FOLDER = resolve(
  __dirname,
  '../../server/lib/spec_definitions/json'
);

export const GENERATED_SUBFOLDER = 'generated';
export const OVERRIDES_SUBFOLDER = 'overrides';
export const MANUAL_SUBFOLDER = 'manual';
