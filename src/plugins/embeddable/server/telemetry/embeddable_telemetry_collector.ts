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

import { EmbeddablePersistableStateService, EmbeddableStateWithType } from '../../common';

/**
 * Function to fetch embeddables that we need to collect telemetry for.
 *
 * @returns - An array of embeddable inputs
 */
type Fetcher = () => Promise<EmbeddableStateWithType[]>;
/**
 * Function to extract any embeddables that are embedded within the embeddable defined by the given input
 *
 * @param input - embeddable input
 * @returns An array of Embeddable Inputs that were embedded in the input param
 */
type Extractor = (input: EmbeddableStateWithType) => EmbeddableStateWithType[];
type TelemetryFunction = EmbeddablePersistableStateService['telemetry'];
type CollectorData = Parameters<TelemetryFunction>[1];

export interface EmbeddableTelemetryCollectorRegistration {
  /**
   * Type of embeddable that this registration for
   */
  type: string;
  fetcher: Fetcher;
  extractor: Extractor;
  /**
   * @returns - The empty object of the stats to be collected about this type of embeddable
   *
   * Example: {
   *   total: 0,
   *   embeded: 0
   * }
   */
  getBaseCollectorData: () => CollectorData;
}

/**
 * Embeddable Telemetry collector is intended to collect telemetry for embeddable types. The embeddables
 * could be in their own saved object, or embedded into another saved object type.  This class is only for gathering
 * the telemetry, NOT for reporting it. Collectors elsewhere can use this TelemetryCollector for gathering the embeddable
 * data to then report themselves.
 */
export class EmbeddableTelemetryCollector {
  private fetchers: Fetcher[];
  private extractors: Record<string, Extractor>;
  private baseCollectorData: Record<string, () => CollectorData>;
  private telemetryFunction: TelemetryFunction;
  private cacheResultLength: number;

  private currentRun: Promise<CollectorData> | undefined;

  constructor(telemetryFunction: TelemetryFunction, cacheLength: number = 5000) {
    this.fetchers = [];
    this.extractors = {};
    this.baseCollectorData = {};
    this.cacheResultLength = cacheLength;

    this.telemetryFunction = telemetryFunction;
  }

  public register(registration: EmbeddableTelemetryCollectorRegistration) {
    this.fetchers.push(registration.fetcher);
    this.extractors[registration.type] = registration.extractor;
    this.baseCollectorData[registration.type] = registration.getBaseCollectorData;
  }

  private async runFetcher(fetcher: Fetcher, collectorData: CollectorData) {
    const results = await fetcher();

    return results.map((result) => this.handleResult(result, collectorData), this);
  }

  private handleResult(result: EmbeddableStateWithType, collectorData: CollectorData) {
    const type = result.type;
    const typeCollectorData = collectorData[type];

    collectorData[type] = this.telemetryFunction(result, typeCollectorData);

    this.extractors[type](result).map(
      (extracted) => this.handleResult(extracted, collectorData),
      this
    );
  }

  public run() {
    if (!this.currentRun) {
      const startingCollectorData = Object.entries(this.baseCollectorData).reduce(
        (collectorData, [key, getCollectorData]) => {
          collectorData[key] = getCollectorData();
          return collectorData;
        },
        {} as CollectorData
      );

      const promises = this.fetchers.map(
        (fetcher) => this.runFetcher(fetcher, startingCollectorData),
        this
      );

      this.currentRun = new Promise<CollectorData>(async (resolve, reject) => {
        await Promise.all(promises).finally(() => {
          setTimeout(() => (this.currentRun = undefined), this.cacheResultLength);
        });
        resolve(startingCollectorData);
      });
    }

    return this.currentRun;
  }
}
