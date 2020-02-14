/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import {
  DataPublicPluginStart,
  addSearchStrategy,
  defaultSearchStrategy,
  DataPublicPluginSetup,
} from '../../../../plugins/data/public';
import { ExpressionsSetup } from '../../../../plugins/expressions/public';

import {
  setIndexPatterns,
  setQueryService,
  setUiSettings,
  setInjectedMetadata,
  setFieldFormats,
  setSearchService,
  setOverlays,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../plugins/data/public/services';
import { SELECT_RANGE_ACTION, selectRangeAction } from './actions/select_range_action';
import { VALUE_CLICK_ACTION, valueClickAction } from './actions/value_click_action';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../plugins/embeddable/public/lib/triggers';
import { UiActionsSetup, UiActionsStart } from '../../../../plugins/ui_actions/public';

import { SearchSetup, SearchStart, SearchService } from './search/search_service';

export interface DataPluginSetupDependencies {
  data: DataPublicPluginSetup;
  expressions: ExpressionsSetup;
  uiActions: UiActionsSetup;
}

export interface DataPluginStartDependencies {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
}

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface DataSetup {
  search: SearchSetup;
}

/**
 * Interface for this plugin's returned `start` contract.
 *
 * @public
 */
export interface DataStart {
  search: SearchStart;
}

/**
 * Data Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces. The remaining items exported here are either types,
 * or static code.
 */

export class DataPlugin
  implements
    Plugin<DataSetup, DataStart, DataPluginSetupDependencies, DataPluginStartDependencies> {
  private readonly search = new SearchService();

  public setup(core: CoreSetup, { data, uiActions }: DataPluginSetupDependencies) {
    setInjectedMetadata(core.injectedMetadata);

    // This is to be deprecated once we switch to the new search service fully
    addSearchStrategy(defaultSearchStrategy);

    uiActions.registerAction(
      selectRangeAction(data.query.filterManager, data.query.timefilter.timefilter)
    );
    uiActions.registerAction(
      valueClickAction(data.query.filterManager, data.query.timefilter.timefilter)
    );

    return {
      search: this.search.setup(core),
    };
  }

  public start(core: CoreStart, { data, uiActions }: DataPluginStartDependencies): DataStart {
    setUiSettings(core.uiSettings);
    setQueryService(data.query);
    setIndexPatterns(data.indexPatterns);
    setFieldFormats(data.fieldFormats);
    setSearchService(data.search);
    setOverlays(core.overlays);

    uiActions.attachAction(SELECT_RANGE_TRIGGER, SELECT_RANGE_ACTION);
    uiActions.attachAction(VALUE_CLICK_TRIGGER, VALUE_CLICK_ACTION);

    return {
      search: this.search.start(core),
    };
  }

  public stop() {}
}
