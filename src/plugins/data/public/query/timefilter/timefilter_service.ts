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

import { IUiSettingsClient } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { TimeHistory, Timefilter, TimeHistoryContract, TimefilterContract } from './index';

/**
 * Filter Service
 * @internal
 */

export interface TimeFilterServiceDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
}

export class TimefilterService {
  public setup({ uiSettings, storage }: TimeFilterServiceDependencies): TimefilterSetup {
    const timefilterConfig = {
      timeDefaults: uiSettings.get('timepicker:timeDefaults'),
      refreshIntervalDefaults: uiSettings.get('timepicker:refreshIntervalDefaults'),
    };
    const history = new TimeHistory(storage);
    const timefilter = new Timefilter(timefilterConfig, history);

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
}

/** @public */
export interface TimefilterSetup {
  timefilter: TimefilterContract;
  history: TimeHistoryContract;
}
