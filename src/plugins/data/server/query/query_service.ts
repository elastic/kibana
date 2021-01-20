/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { querySavedObjectType } from '../saved_objects';

export class QueryService implements Plugin<void> {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(querySavedObjectType);
  }

  public start() {}
}
