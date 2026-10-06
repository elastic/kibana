/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import { type ServiceStatus, type CoreStatus } from '@kbn/core-status-common';
interface Deps {
  overall: ServiceStatus;
  core: CoreStatus;
  plugins: Record<PluginName, ServiceStatus>;
  versionWithoutSnapshot: string;
}
export interface LegacyStatusInfo {
  overall: LegacyStatusOverall;
  statuses: StatusComponentHttp[];
}
interface LegacyStatusOverall {
  state: LegacyStatusState;
  title: string;
  nickname: string;
  uiColor: LegacyStatusUiColor;
  /** ISO-8601 date string w/o timezone */
  since: string;
  icon?: string;
}
type LegacyStatusState = 'green' | 'yellow' | 'red';
type LegacyStatusUiColor = 'success' | 'warning' | 'danger';
export declare const calculateLegacyStatus: ({
  core,
  overall,
  plugins,
  versionWithoutSnapshot,
}: Deps) => LegacyStatusInfo;
interface StatusComponentHttp {
  id: string;
  state: LegacyStatusState;
  message: string;
  uiColor: LegacyStatusUiColor;
  icon: string;
  since: string;
}
export {};
