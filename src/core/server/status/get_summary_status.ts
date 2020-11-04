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
export const getSummaryStatus = (
  statuses: Array<[string, ServiceStatus]>,
  { allAvailableSummary = `All services are available` }: { allAvailableSummary?: string } = {}
): ServiceStatus => {
  const { highestLevel, highestStatuses } = highestLevelSummary(statuses);

  if (highestLevel === ServiceStatusLevels.available) {
    return {
      level: ServiceStatusLevels.available,
      summary: allAvailableSummary,
    };
  } else if (highestStatuses.length === 1) {
    const [serviceName, status] = highestStatuses[0]! as [string, ServiceStatus];
    return {
      ...status,
      summary: `[${serviceName}]: ${status.summary!}`,
      // TODO: include URL to status page
      detail: status.detail ?? `See the status page for more information`,
      meta: {
        affectedServices: { [serviceName]: status },
      },
    };
  } else {
    return {
      level: highestLevel,
      summary: `[${highestStatuses.length}] services are ${highestLevel.toString()}`,
      // TODO: include URL to status page
      detail: `See the status page for more information`,
      meta: {
        affectedServices: Object.fromEntries(highestStatuses),
      },
    };
  }
};

type StatusPair = [string, ServiceStatus];

const highestLevelSummary = (
  statuses: StatusPair[]
): { highestLevel: ServiceStatusLevel; highestStatuses: StatusPair[] } => {
  let highestLevel: ServiceStatusLevel = ServiceStatusLevels.available;
  let highestStatuses: StatusPair[] = [];

  for (const pair of statuses) {
    if (pair[1].level === highestLevel) {
      highestStatuses.push(pair);
    } else if (pair[1].level > highestLevel) {
      highestLevel = pair[1].level;
      highestStatuses = [pair];
    }
  }

  return {
    highestLevel,
    highestStatuses,
  };
};
