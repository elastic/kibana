/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeHistoryContract, TimefilterContract } from '.';
import type { NowProviderInternalContract } from '../../now_provider';
export interface TimeFilterServiceDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  minRefreshInterval: number;
}
/**
 * Filter Service
 * @internal
 */
export declare class TimefilterService {
  private readonly nowProvider;
  constructor(nowProvider: NowProviderInternalContract);
  setup({
    uiSettings,
    storage,
    minRefreshInterval,
  }: TimeFilterServiceDependencies): TimefilterSetup;
  start(): void;
  stop(): void;
}
/** @public */
export interface TimefilterSetup {
  timefilter: TimefilterContract;
  history: TimeHistoryContract;
}
