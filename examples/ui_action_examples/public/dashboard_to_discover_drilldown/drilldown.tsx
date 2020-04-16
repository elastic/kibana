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

import React from 'react';
import { UiActionExamplesStartDependencies as Start } from '../plugin';
import { reactToUiComponent } from '../../../../src/plugins/kibana_react/public';
import { StartServicesGetter } from '../../../../src/plugins/kibana_utils/public';
import { PlaceContext, ActionContext, Config, CollectConfigProps } from './types';
import { CollectConfigContainer } from './collect_config';
import { DASHBOARD_TO_DISCOVER_DRILLDOWN } from './constants';
import { DrilldownDefinition as Drilldown } from '../../../../x-pack/plugins/drilldowns/public';
import { txtGoToDiscover } from './i18n';

export interface Params {
  start: StartServicesGetter<Pick<Start, 'data'>>;
}

export class DashboardToDiscoverDrilldown
  implements Drilldown<Config, PlaceContext, ActionContext> {
  constructor(protected readonly params: Params) {}

  public readonly id = DASHBOARD_TO_DISCOVER_DRILLDOWN;

  public readonly order = 50;

  public readonly getDisplayName = () => txtGoToDiscover;

  public readonly euiIcon = 'discoverApp';

  private readonly ReactCollectConfig: React.FC<CollectConfigProps> = props => (
    <CollectConfigContainer {...props} params={this.params} />
  );

  public readonly CollectConfig = reactToUiComponent(this.ReactCollectConfig);

  public readonly createConfig = () => ({
    pickIndexPattern: false,
    carryFiltersAndQuery: true,
    carryTimeRange: true,
  });

  public readonly isConfigValid = (config: Config): config is Config => {
    if (!config.indexPatternId) return false;
    return true;
  };

  public readonly execute = () => {
    alert('Go to discover!');
  };
}
