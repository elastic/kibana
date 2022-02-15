/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart, DEFAULT_APP_CATEGORIES } from 'kibana/server';
import { todoSavedObject } from './todo_saved_object';
import { bookSavedObject } from './book_saved_object';
import { searchableListSavedObject } from './searchable_list_saved_object';
import { EmbeddableSetup } from '../../../src/plugins/embeddable/server';
import { PluginSetupContract as FeaturesSetup } from '../../../x-pack/plugins/features/server';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  features?: FeaturesSetup;
}

export class EmbeddableExamplesPlugin
  implements Plugin<void, void, EmbeddableExamplesSetupDependencies>
{
  public setup(core: CoreSetup, { embeddable, features }: EmbeddableExamplesSetupDependencies) {
    core.savedObjects.registerType(todoSavedObject);
    core.savedObjects.registerType(bookSavedObject);
    core.savedObjects.registerType(searchableListSavedObject(embeddable));

    if (features) {
      features.registerKibanaFeature({
        id: 'embeddableExamplesTodo',
        name: 'embeddableExamplesTodo',
        category: DEFAULT_APP_CATEGORIES.kibana,
        app: ['embeddableExamples'],
        privileges: {
          all: {
            app: ['embeddableExamples'],
            savedObject: { all: [todoSavedObject.name, bookSavedObject.name], read: [] },
            ui: ['saveTodo'],
          },
          read: {
            app: ['embeddableExamples'],
            savedObject: { all: [], read: [todoSavedObject.name, bookSavedObject.name] },
            ui: ['readTodo'],
          },
        },
      });
    }
  }

  public start(core: CoreStart) {}

  public stop() {}
}
