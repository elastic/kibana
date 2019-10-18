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

class TelemetryCollectionManager {
  private getterMethod?: any;
  private collectionTitle?: string;
  private getterMethodPriority = 0;

  public setStatsGetter = (statsGetter: any, title: string, priority = 0) => {
    if (priority >= this.getterMethodPriority) {
      this.getterMethod = statsGetter;
      this.collectionTitle = title;
      this.getterMethodPriority = priority;
    }
  };

  getCollectionTitle = () => {
    return this.collectionTitle;
  };

  public getStatsGetter = () => {
    if (!this.getterMethod) {
      throw Error('Stats getter method not set.');
    }
    return {
      getStats: this.getterMethod,
      priority: this.getterMethodPriority,
      title: this.collectionTitle,
    };
  };
}

export const telemetryCollectionManager = new TelemetryCollectionManager();
