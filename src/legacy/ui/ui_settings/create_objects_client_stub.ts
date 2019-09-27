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

import sinon from 'sinon';
import { SavedObjectsClient } from '../../../../src/core/server';

export const savedObjectsClientErrors = SavedObjectsClient.errors;

export interface SavedObjectsClientStub {
  update: sinon.SinonStub<any[], any>;
  get: sinon.SinonStub<any[], any>;
  create: sinon.SinonStub<any[], any>;
  errors: typeof savedObjectsClientErrors;
}

export function createObjectsClientStub(esDocSource = {}): SavedObjectsClientStub {
  const savedObjectsClient = {
    update: sinon.stub(),
    get: sinon.stub().returns({ attributes: esDocSource }),
    create: sinon.stub(),
    errors: savedObjectsClientErrors,
  };
  return savedObjectsClient;
}
