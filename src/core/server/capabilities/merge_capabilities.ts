/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeWith } from 'lodash';
import { Capabilities } from './types';

export const mergeCapabilities = (...sources: Array<Partial<Capabilities>>): Capabilities =>
  mergeWith({}, ...sources, (a: any, b: any) => {
    if (
      (typeof a === 'boolean' && typeof b === 'object') ||
      (typeof a === 'object' && typeof b === 'boolean')
    ) {
      throw new Error(`conflict trying to merge boolean with object`);
    }

    if (typeof a === 'boolean' && typeof b === 'boolean' && a !== b) {
      throw new Error(`conflict trying to merge booleans with different values`);
    }
  });
