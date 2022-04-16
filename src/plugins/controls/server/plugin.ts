/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';

import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { PluginSetup as DataSetup } from '@kbn/data-plugin/server';
import { setupOptionsListSuggestionsRoute } from './control_types/options_list/options_list_suggestions_route';
import { controlGroupContainerPersistableStateServiceFactory } from './control_group/control_group_container_factory';
import { optionsListPersistableStateServiceFactory } from './control_types/options_list/options_list_embeddable_factory';
import { timeSliderPersistableStateServiceFactory } from './control_types/time_slider/time_slider_embeddable_factory';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  data: DataSetup;
}

export class ControlsPlugin implements Plugin<object, object, SetupDeps> {
  public setup(core: CoreSetup, { embeddable, data }: SetupDeps) {
    embeddable.registerEmbeddableFactory(optionsListPersistableStateServiceFactory());
    embeddable.registerEmbeddableFactory(timeSliderPersistableStateServiceFactory());

    embeddable.registerEmbeddableFactory(
      controlGroupContainerPersistableStateServiceFactory(embeddable)
    );

    setupOptionsListSuggestionsRoute(core, data.autocomplete.getAutocompleteSettings);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
