/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { deepFreeze } from '@kbn/std';

import { ServiceStatusLevels, ServiceStatus, CoreStatus } from './types';
import { PluginName } from '../plugins';

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
type LegacyStatusIcon = 'danger' | 'warning' | 'success';
type LegacyStatusUiColor = 'success' | 'warning' | 'danger';

interface LegacyStateAttr {
  id: LegacyStatusState;
  state: LegacyStatusState;
  title: string;
  icon: LegacyStatusIcon;
  uiColor: LegacyStatusUiColor;
  nickname: string;
}

export const calculateLegacyStatus = ({
  core,
  overall,
  plugins,
  versionWithoutSnapshot,
}: Deps): LegacyStatusInfo => {
  const since = new Date().toISOString();
  const overallLegacy: LegacyStatusOverall = {
    since,
    ...pick(STATUS_LEVEL_LEGACY_ATTRS[overall.level.toString()], [
      'state',
      'title',
      'nickname',
      'icon',
      'uiColor',
    ]),
  };
  const coreStatuses = Object.entries(core).map(([serviceName, s]) =>
    serviceStatusToHttpComponent(`core:${serviceName}@${versionWithoutSnapshot}`, s, since)
  );
  const pluginStatuses = Object.entries(plugins).map(([pluginName, s]) =>
    serviceStatusToHttpComponent(`plugin:${pluginName}@${versionWithoutSnapshot}`, s, since)
  );

  const componentStatuses: StatusComponentHttp[] = [...coreStatuses, ...pluginStatuses];

  return {
    overall: overallLegacy,
    statuses: componentStatuses,
  };
};

interface StatusComponentHttp {
  id: string;
  state: LegacyStatusState;
  message: string;
  uiColor: LegacyStatusUiColor;
  icon: string;
  since: string;
}

const serviceStatusToHttpComponent = (
  serviceName: string,
  status: ServiceStatus,
  since: string
): StatusComponentHttp => ({
  id: serviceName,
  message: [status.summary, status.detail].filter(Boolean).join(' '),
  since,
  ...serviceStatusAttrs(status),
});

const serviceStatusAttrs = (status: ServiceStatus) =>
  pick(STATUS_LEVEL_LEGACY_ATTRS[status.level.toString()], ['state', 'icon', 'uiColor']);

const STATUS_LEVEL_LEGACY_ATTRS = deepFreeze<Record<string, LegacyStateAttr>>({
  [ServiceStatusLevels.critical.toString()]: {
    id: 'red',
    state: 'red',
    title: i18n.translate('core.status.redTitle', {
      defaultMessage: 'Red',
    }),
    icon: 'danger',
    uiColor: 'danger',
    nickname: 'Danger Will Robinson! Danger!',
  },
  [ServiceStatusLevels.unavailable.toString()]: {
    id: 'red',
    state: 'red',
    title: i18n.translate('core.status.redTitle', {
      defaultMessage: 'Red',
    }),
    icon: 'danger',
    uiColor: 'danger',
    nickname: 'Danger Will Robinson! Danger!',
  },
  [ServiceStatusLevels.degraded.toString()]: {
    id: 'yellow',
    state: 'yellow',
    title: i18n.translate('core.status.yellowTitle', {
      defaultMessage: 'Yellow',
    }),
    icon: 'warning',
    uiColor: 'warning',
    nickname: "I'll be back",
  },
  [ServiceStatusLevels.available.toString()]: {
    id: 'green',
    state: 'green',
    title: i18n.translate('core.status.greenTitle', {
      defaultMessage: 'Green',
    }),
    icon: 'success',
    uiColor: 'success',
    nickname: 'Looking good',
  },
});
