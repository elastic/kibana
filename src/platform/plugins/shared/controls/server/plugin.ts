/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin, PluginInitializerContext, Logger } from '@kbn/core/server';
import type { PluginSetup as DataSetup } from '@kbn/data-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { PluginSetup as KqlSetup } from '@kbn/kql/server';

import { registerESQLControlTransforms } from './transforms/esql_control_transforms';
import { registerOptionsListControlTransforms } from './transforms/options_list_control_transforms';
import { registerRangeSliderControlTransforms } from './transforms/range_slider_control_transforms';
import { registerTimeSliderControlTransforms } from './transforms/time_slider_control_transforms';
import { setupOptionsListClusterSettingsRoute } from './options_list/options_list_cluster_settings_route';
import { setupOptionsListSuggestionsRoute } from './options_list/options_list_suggestions_route';
import { setKibanaServices } from './kibana_services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  data: DataSetup;
  kql: KqlSetup;
}

export class ControlsPlugin implements Plugin<object, object, SetupDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup, { embeddable, kql }: SetupDeps) {
    registerESQLControlTransforms(embeddable);
    registerOptionsListControlTransforms(embeddable);
    registerRangeSliderControlTransforms(embeddable);
    registerTimeSliderControlTransforms(embeddable);

    setupOptionsListClusterSettingsRoute(core);
    setupOptionsListSuggestionsRoute(core, kql.autocomplete.getAutocompleteSettings);
    return {};
  }

  public start() {
    setKibanaServices(this.logger);
    return {};
  }

  public stop() {}
}
