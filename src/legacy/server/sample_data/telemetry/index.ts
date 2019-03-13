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

import * as Hapi from 'hapi';

const SAVED_OBJECT_ID = 'sample-data-telemetry';

export class TelemetryKeeper {
  public addInstall: (dataSet: string) => void;
  public addUninstall: (dataSet: string) => void;

  constructor(request: Hapi.Request) {
    const { server } = request;
    const {
      savedObjects: { getSavedObjectsRepository },
    } = server;
    const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);

    this.addInstall = (dataSet: string) => {
      internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, `installCount`);
    };
    this.addUninstall = (dataSet: string) => {
      internalRepository.incrementCounter(SAVED_OBJECT_ID, dataSet, `unInstallCount`);
    };
  }
}
