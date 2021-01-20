/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/server';
import { todoSavedObject } from './todo_saved_object';
import { bookSavedObject } from './book_saved_object';

export class EmbeddableExamplesPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(todoSavedObject);
    core.savedObjects.registerType(bookSavedObject);
  }

  public start(core: CoreStart) {}

  public stop() {}
}
