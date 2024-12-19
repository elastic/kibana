/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { PluginSetup as DataSetup } from '@kbn/data-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { PluginSetup as UnifiedSearchSetup } from '@kbn/unified-search-plugin/server';
import { setupOptionsListSuggestionsRoute } from './options_list/options_list_suggestions_route';
import { controlGroupContainerPersistableStateServiceFactory } from './control_group/control_group_container_factory';
import { optionsListPersistableStateServiceFactory } from './options_list/options_list_embeddable_factory';
import { rangeSliderPersistableStateServiceFactory } from './range_slider/range_slider_embeddable_factory';
import { timeSliderPersistableStateServiceFactory } from './time_slider/time_slider_embeddable_factory';
import { esqlStaticControlPersistableStateServiceFactory } from './esql_control/esql_control_factory';
import { setupOptionsListClusterSettingsRoute } from './options_list/options_list_cluster_settings_route';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  data: DataSetup;
  unifiedSearch: UnifiedSearchSetup;
}

export class ControlsPlugin implements Plugin<object, object, SetupDeps> {
  public setup(core: CoreSetup, { embeddable, unifiedSearch }: SetupDeps) {
    embeddable.registerEmbeddableFactory(
      controlGroupContainerPersistableStateServiceFactory(embeddable)
    );
    embeddable.registerEmbeddableFactory(optionsListPersistableStateServiceFactory());
    embeddable.registerEmbeddableFactory(rangeSliderPersistableStateServiceFactory());
    embeddable.registerEmbeddableFactory(timeSliderPersistableStateServiceFactory());
    embeddable.registerEmbeddableFactory(esqlStaticControlPersistableStateServiceFactory());
    setupOptionsListClusterSettingsRoute(core);
    setupOptionsListSuggestionsRoute(core, unifiedSearch.autocomplete.getAutocompleteSettings);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
