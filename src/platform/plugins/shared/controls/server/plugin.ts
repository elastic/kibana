/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataSetup } from '@kbn/data-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { PluginSetup as UnifiedSearchSetup } from '@kbn/unified-search-plugin/server';

import { registerDataControlTransforms } from '../common/transforms/data_controls/register_data_control_transforms';
import { setupOptionsListClusterSettingsRoute } from './options_list/options_list_cluster_settings_route';
import { setupOptionsListSuggestionsRoute } from './options_list/options_list_suggestions_route';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  data: DataSetup;
  unifiedSearch: UnifiedSearchSetup;
}

export class ControlsPlugin implements Plugin<object, object, SetupDeps> {
  public setup(core: CoreSetup, { embeddable, unifiedSearch }: SetupDeps) {
    registerDataControlTransforms(embeddable, OPTIONS_LIST_CONTROL, 'optionsListDataView', [
      'optionsListDataView',
      'optionsListControlDataView',
    ]);

    registerDataControlTransforms(embeddable, RANGE_SLIDER_CONTROL, 'rangeSliderDataView', [
      'rangeSliderDataView',
      'rangeSliderControlDataView',
    ]);

    setupOptionsListClusterSettingsRoute(core);
    setupOptionsListSuggestionsRoute(core, unifiedSearch.autocomplete.getAutocompleteSettings);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
