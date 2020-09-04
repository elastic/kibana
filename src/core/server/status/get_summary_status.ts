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

import { ServiceStatus, ServiceStatusLevels, ServiceStatusLevel } from './types';

/**
 * Returns a single {@link ServiceStatus} that summarizes the most severe status level from a group of statuses.
 * @param statuses
 */
export const getSummaryStatus = (statuses: Array<[string, ServiceStatus]>): ServiceStatus => {
  const grouped = groupByLevel(statuses);
  const highestSeverityLevel = getHighestSeverityLevel(grouped.keys());
  const highestSeverityGroup = grouped.get(highestSeverityLevel)!;

  if (highestSeverityLevel === ServiceStatusLevels.available) {
    return {
      level: ServiceStatusLevels.available,
      summary: `All services are available`,
    };
  } else if (highestSeverityGroup.size === 1) {
    const [serviceName, status] = [...highestSeverityGroup.entries()][0];
    return {
      ...status,
      summary: `[${serviceName}]: ${status.summary!}`,
    };
  } else {
    return {
      level: highestSeverityLevel,
      summary: `[${highestSeverityGroup.size}] services are ${highestSeverityLevel.toString()}`,
      // TODO: include URL to status page
      detail: `See the status page for more information`,
      meta: {
        affectedServices: Object.fromEntries([...highestSeverityGroup]),
      },
    };
  }
};

const groupByLevel = (
  statuses: Array<[string, ServiceStatus]>
): Map<ServiceStatusLevel, Map<string, ServiceStatus>> => {
  const byLevel = new Map<ServiceStatusLevel, Map<string, ServiceStatus>>();

  for (const [serviceName, status] of statuses) {
    let levelMap = byLevel.get(status.level);
    if (!levelMap) {
      levelMap = new Map<string, ServiceStatus>();
      byLevel.set(status.level, levelMap);
    }

    levelMap.set(serviceName, status);
  }

  return byLevel;
};

const getHighestSeverityLevel = (levels: Iterable<ServiceStatusLevel>): ServiceStatusLevel => {
  const sorted = [...levels].sort((a, b) => {
    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  });
  return sorted[sorted.length - 1] ?? ServiceStatusLevels.available;
};
