/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import {
  TimeHistory,
  Timefilter,
  TimeHistoryContract,
  TimefilterContract,
  TimefilterConfig,
} from '.';
import { UI_SETTINGS } from '../../../common';
import { NowProviderInternalContract } from '../../now_provider';

export interface TimeFilterServiceDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  minRefreshInterval: number;
}

/**
 * Filter Service
 * @internal
 */
export class TimefilterService {
  constructor(private readonly nowProvider: NowProviderInternalContract) {}

  public setup({
    uiSettings,
    storage,
    minRefreshInterval,
  }: TimeFilterServiceDependencies): TimefilterSetup {
    const timefilterConfig: TimefilterConfig = {
      timeDefaults: uiSettings.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS),
      refreshIntervalDefaults: uiSettings.get(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS),
      minRefreshIntervalDefault: minRefreshInterval,
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
