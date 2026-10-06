/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { PublicContract } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { SearchSessionSavedObject } from '../sessions_client';
import type { UISession } from '../types';
export type ISearchSessionEBTManager = PublicContract<SearchSessionEBTManager>;
export declare class SearchSessionEBTManager {
  private reportEventCore;
  private logger;
  constructor({ core, logger }: { core: CoreSetup; logger: Logger });
  private reportEvent;
  trackBgsStarted({
    entryPoint,
    session,
  }: {
    entryPoint: string;
    session: SearchSessionSavedObject;
  }): void;
  trackBgsCancelled({
    session,
    cancelSource,
  }: {
    session: SearchSessionSavedObject;
    cancelSource: string;
  }): void;
  trackBgsOpened({ session, resumeSource }: { session: UISession; resumeSource: string }): void;
  trackBgsListView({ entryPoint }: { entryPoint: string }): void;
}
