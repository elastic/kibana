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
// Defines test plugins for use in testing migrations. Going from v0 -> v1 -> v2
// should demonstrate:
// - disabled plugins are properly handled (thus, plugin p2 gets disabled in v2)
// - seeds are transformed (thus plugin p3 does a transform after its seed)
const p1v1 = {
  id: 'p1',
  mappings: { p1: { properties: { name: { type: 'text' } } } },
  migrations: [{
    id: 'p1m1',
    type: 'p1',
    seed: () => ({
      id: 'sample',
      type: 'p1',
      attributes: { name: 'P1 Name!' },
    }),
  }],
};

const p1v2 = {
  id: 'p1',
  mappings: { p1: { properties: { fullName: { type: 'text' } } } },
  migrations: [ ...p1v1.migrations, {
    id: 'p1m2',
    type: 'p1',
    transform: (doc) => ({
      ...doc,
      attributes: { fullName: doc.attributes.name },
    }),
  }, {
    id: 'p1m3',
    type: 'p1',
    seed: () => ({
      id: 'newseedsofcontemplation',
      type: 'p1',
      attributes: { fullName: 'Thomas Merton' },
    }),
  }],
};

const p2v1 = {
  id: 'p2',
  mappings: { p2: { properties: { thing: { type: 'text' } } } },
  migrations: [{
    id: 'p2m1',
    type: 'p2',
    seed: () => ({
      id: 'p2doc',
      type: 'p2',
      attributes: { thing: 'P2 Thingamabob' },
    }),
  }],
};

const p3v2 = {
  id: 'p3',
  mappings: { p3: { properties: { shtuff: { type: 'text' } } } },
  migrations: [{
    id: 'p3m1',
    type: 'p3',
    seed: () => ({
      id: 'p3doc',
      type: 'p3',
      attributes: { shtuff: 'Shtuff Happens' },
    }),
  }, {
    id: 'p3m2',
    type: 'p3',
    transform: (doc) => ({
      ...doc,
      attributes: {
        ...doc.attributes,
        shtuff: doc.attributes.shtuff.toUpperCase(),
      },
    }),
  }],
};

const v1 = [
  p1v1,
  p2v1,
];

const v2 = [
  p1v2,
  p3v2,
];

module.exports = {
  testPlugins: { v1, v2 },
};
