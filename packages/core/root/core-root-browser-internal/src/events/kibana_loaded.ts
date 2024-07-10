/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  KBN_LOAD_MARKS,
  KIBANA_LOADED_EVENT,
  LOAD_BOOTSTRAP_START,
  LOAD_CORE_CREATED,
  LOAD_FIRST_NAV,
  LOAD_SETUP_DONE,
  LOAD_START,
  LOAD_START_DONE,
} from './event_names';
import { fetchOptionalMemoryInfo } from './fetch_optional_memory_info';

// Expands the definition of navigator to include experimental features
interface ExtendedNavigator {
  connection?: {
    effectiveType?: string;
  };
  // Estimated RAM
  deviceMemory?: number;
  // Number of cores
  hardwareConcurrency?: number;
}

export function registerLoadedKibanaEventType(analytics: AnalyticsServiceSetup) {
  analytics.registerEventType({
    eventType: 'Loaded Kibana',
    schema: {
      kibana_version: {
        type: 'keyword',
        _meta: { description: 'The version of Kibana' },
      },
      protocol: {
        type: 'keyword',
        _meta: {
          description: 'Value from window.location.protocol',
        },
      },
    },
  });
}

export function reportKibanaLoadedEvent(
  analytics: AnalyticsServiceStart,
  coreContext: CoreContext
) {
  /**
   * @deprecated here for backwards compatibility in FullStory
   **/
  analytics.reportEvent('Loaded Kibana', {
    kibana_version: coreContext.env.packageInfo.version,
    protocol: window.location.protocol,
  });

  const timing = getLoadMarksInfo();

  const navigatorExt = navigator as ExtendedNavigator;
  const navigatorInfo: Record<string, string> = {};
  if (navigatorExt.deviceMemory) {
    navigatorInfo.deviceMemory = String(navigatorExt.deviceMemory);
  }
  if (navigatorExt.hardwareConcurrency) {
    navigatorInfo.hardwareConcurrency = String(navigatorExt.hardwareConcurrency);
  }

  reportPerformanceMetricEvent(analytics, {
    eventName: KIBANA_LOADED_EVENT,
    meta: {
      kibana_version: coreContext.env.packageInfo.version,
      protocol: window.location.protocol,
      ...fetchOptionalMemoryInfo(),
      // Report some hardware metrics for bucketing
      ...navigatorInfo,
    },
    duration: timing[LOAD_FIRST_NAV],
    key1: LOAD_START,
    value1: timing[LOAD_START],
    key2: LOAD_BOOTSTRAP_START,
    value2: timing[LOAD_BOOTSTRAP_START],
    key3: LOAD_CORE_CREATED,
    value3: timing[LOAD_CORE_CREATED],
    key4: LOAD_SETUP_DONE,
    value4: timing[LOAD_SETUP_DONE],
    key5: LOAD_START_DONE,
    value5: timing[LOAD_START_DONE],
  });
  performance.clearMarks(KBN_LOAD_MARKS);
}

function getLoadMarksInfo(): Record<string, number> {
  if (!performance) {
    return {};
  }
  const reportData: Record<string, number> = {};
  const marks = performance.getEntriesByName(KBN_LOAD_MARKS);
  for (const mark of marks) {
    reportData[(mark as PerformanceMark).detail] = mark.startTime;
  }

  return reportData;
}
