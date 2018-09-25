/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '../common/lib/registry';
import { RenderFunction } from './render_function';

class RenderFunctionsRegistry extends Registry {
  wrapper(obj) {
    return new RenderFunction(obj);
  }
}

export const renderFunctionsRegistry = new RenderFunctionsRegistry();
