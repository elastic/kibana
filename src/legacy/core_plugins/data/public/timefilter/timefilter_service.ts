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

import { UiSettingsClientContract } from 'src/core/public';
import { TimeRange, RefreshInterval } from 'src/plugins/data/public';
import moment from 'moment';

import { IScope } from 'angular';
import uiRoutes from 'ui/routes';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
import { TimeHistoryManager } from './time_history';
import { TimefilterManager } from './timefilter';
import { Timefilter, TimeHistory } from './index';

/**
 * Filter Service
 * @internal
 */

export interface TimeFilterServiceDependencies {
  uiSettings: UiSettingsClientContract;
}

export class TimefilterService {
  public setup({ uiSettings }: TimeFilterServiceDependencies) {
    const history: TimeHistory = new TimeHistoryManager();
    const timefilter: Timefilter = new TimefilterManager(uiSettings, history);

    uiRoutes.addSetupWork((globalState, $rootScope) => {
      return TimefilterService.registerTimefilterWithGlobalState(
        timefilter,
        uiSettings,
        globalState,
        $rootScope
      );
    });

    return {
      timefilter,
      history,
    };
  }

  public start() {
    // nothing to do here yet
  }

  public stop() {
    // nothing to do here yet
  }

  // TODO
  // remove everything underneath once globalState is no longer an angular service
  // and listener can be registered without angular.
  private static convertISO8601(stringTime: string): string {
    const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    return obj.isValid() ? obj.toString() : stringTime;
  }

  // Currently some parts of Kibana (index patterns, timefilter) rely on addSetupWork in the uiRouter
  // and require it to be executed to properly function.
  // This function is exposed for applications that do not use uiRoutes like APM
  // Kibana issue https://github.com/elastic/kibana/issues/19110 tracks the removal of this dependency on uiRouter
  private static registerTimefilterWithGlobalState(
    timefilter: Timefilter,
    uiSettings: UiSettingsClientContract,
    globalState: any,
    $rootScope: IScope
  ) {
    const timeDefaults = uiSettings.get('timepicker:timeDefaults');
    const refreshIntervalDefaults = uiSettings.get('timepicker:refreshIntervalDefaults');

    timefilter.setTime(_.defaults(globalState.time || {}, timeDefaults));
    timefilter.setRefreshInterval(
      _.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults)
    );

    globalState.on('fetch_with_changes', () => {
      // clone and default to {} in one
      const newTime: TimeRange = _.defaults({}, globalState.time, timeDefaults);
      const newRefreshInterval: RefreshInterval = _.defaults(
        {},
        globalState.refreshInterval,
        refreshIntervalDefaults
      );

      if (newTime) {
        if (newTime.to) newTime.to = TimefilterService.convertISO8601(newTime.to);
        if (newTime.from) newTime.from = TimefilterService.convertISO8601(newTime.from);
      }

      timefilter.setTime(newTime);
      timefilter.setRefreshInterval(newRefreshInterval);
    });

    const updateGlobalStateWithTime = () => {
      globalState.time = timefilter.getTime();
      globalState.refreshInterval = timefilter.getRefreshInterval();
      globalState.save();
    };

    subscribeWithScope($rootScope, timefilter.getRefreshIntervalUpdate$(), {
      next: updateGlobalStateWithTime,
    });

    subscribeWithScope($rootScope, timefilter.getTimeUpdate$(), {
      next: updateGlobalStateWithTime,
    });
  }
}

/** @public */
export type TimefilterSetup = ReturnType<TimefilterService['setup']>;
