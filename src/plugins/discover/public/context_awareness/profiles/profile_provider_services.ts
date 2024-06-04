/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { DiscoverStartPlugins } from '../../types';

export interface ContextAwarenessService {
  isLogsIndexPattern(indexPattern: string): boolean;
}

export interface ProfileProviderServices {
  contextAwareness: ContextAwarenessService;
}

export const createProfileProviderServices = (
  core: CoreStart,
  plugins: DiscoverStartPlugins
): ProfileProviderServices => {
  return {
    contextAwareness: createContextAwarenessService(core, plugins),
  };
};

const createContextAwarenessService = (_core: CoreStart, _plugins: DiscoverStartPlugins) => {
  // This is initially an hard-coded set of well-known base patterns,
  // we can extend this allowed list with any setting coming from uiSettings
  const ALLOWED_LOGS_DATA_SOURCES = [
    createRegExpPatternFrom(['log', 'logs', 'logstash', 'auditbeat', 'filebeat', 'winlogbeat']),
  ];

  const isLogsIndexPattern = (indexPattern: string) =>
    testPatternAgainstAllowedList(ALLOWED_LOGS_DATA_SOURCES)(indexPattern);

  return {
    isLogsIndexPattern,
  };
};
