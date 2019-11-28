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

export const functionsRegistry = {};
export const renderersRegistry = {};
export const typesRegistry = {};
export const registries = {
  browserFunctions: functionsRegistry,
  renderers: renderersRegistry,
  types: typesRegistry,
};

const resetRegistry = (registry: any) => {
  registry.wrapper = sinon.stub();
  registry.register = sinon.stub();
  registry.toJS = sinon.stub();
  registry.toArray = sinon.stub();
  registry.get = sinon.stub();
  registry.getProp = sinon.stub();
  registry.reset = sinon.stub();
};
const resetAll = () => Object.values(registries).forEach(resetRegistry);

resetAll();
afterEach(resetAll);
