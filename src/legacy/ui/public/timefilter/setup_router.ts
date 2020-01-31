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

import _ from 'lodash';
import { IScope } from 'angular';
import moment from 'moment';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
import chrome from 'ui/chrome';
import { RefreshInterval, TimeRange, TimefilterContract } from 'src/plugins/data/public';
import { Subscription } from 'rxjs';

// TODO
// remove everything underneath once globalState is no longer an angular service
// and listener can be registered without angular.
function convertISO8601(stringTime: string): string {
  const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
  return obj.isValid() ? obj.toISOString() : stringTime;
}

export function getTimefilterConfig() {
  const settings = chrome.getUiSettingsClient();
  return {
    timeDefaults: settings.get('timepicker:timeDefaults'),
    refreshIntervalDefaults: settings.get('timepicker:refreshIntervalDefaults'),
  };
}

export const registerTimefilterWithGlobalStateFactory = (
  timefilter: TimefilterContract,
  globalState: any,
  $rootScope: IScope
) => {
  // settings have to be re-fetched here, to make sure that settings changed by overrideLocalDefault are taken into account.
  const config = getTimefilterConfig();
  timefilter.setTime(_.defaults(globalState.time || {}, config.timeDefaults));
  timefilter.setRefreshInterval(
    _.defaults(globalState.refreshInterval || {}, config.refreshIntervalDefaults)
  );

  globalState.on('fetch_with_changes', () => {
    // clone and default to {} in one
    const newTime: TimeRange = _.defaults({}, globalState.time, config.timeDefaults);
    const newRefreshInterval: RefreshInterval = _.defaults(
      {},
      globalState.refreshInterval,
      config.refreshIntervalDefaults
    );

    if (newTime) {
      if (newTime.to) newTime.to = convertISO8601(newTime.to);
      if (newTime.from) newTime.from = convertISO8601(newTime.from);
    }

    timefilter.setTime(newTime);
    timefilter.setRefreshInterval(newRefreshInterval);
  });

  const updateGlobalStateWithTime = () => {
    globalState.time = timefilter.getTime();
    globalState.refreshInterval = timefilter.getRefreshInterval();
    globalState.save();
  };

  const subscriptions = new Subscription();
  subscriptions.add(
    subscribeWithScope($rootScope, timefilter.getRefreshIntervalUpdate$(), {
      next: updateGlobalStateWithTime,
    })
  );

  subscriptions.add(
    subscribeWithScope($rootScope, timefilter.getTimeUpdate$(), {
      next: updateGlobalStateWithTime,
    })
  );

  $rootScope.$on('$destroy', () => {
    subscriptions.unsubscribe();
  });
};

// Currently some parts of Kibana (index patterns, timefilter) rely on addSetupWork in the uiRouter
// and require it to be executed to properly function.
// This function is exposed for applications that do not use uiRoutes like APM
// Kibana issue https://github.com/elastic/kibana/issues/19110 tracks the removal of this dependency on uiRouter
export const registerTimefilterWithGlobalState = _.once(registerTimefilterWithGlobalStateFactory);
