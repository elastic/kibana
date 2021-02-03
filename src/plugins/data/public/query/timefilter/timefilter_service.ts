/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { TimeHistory, Timefilter, TimeHistoryContract, TimefilterContract } from './index';
import { UI_SETTINGS } from '../../../common';
import { NowProviderInternalContract } from '../../now_provider';

/**
 * Filter Service
 * @internal
 */

export interface TimeFilterServiceDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
}

export class TimefilterService {
  constructor(private readonly nowProvider: NowProviderInternalContract) {}

  public setup({ uiSettings, storage }: TimeFilterServiceDependencies): TimefilterSetup {
    const timefilterConfig = {
      timeDefaults: uiSettings.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS),
      refreshIntervalDefaults: uiSettings.get(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS),
    };
    const history = new TimeHistory(storage);
    const timefilter = new Timefilter(timefilterConfig, history, this.nowProvider);

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
