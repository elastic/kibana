"use strict";

var parser = _interopRequireWildcard(require("@babel/parser"));

var _traverse = _interopRequireDefault(require("@babel/traverse"));

var _visitors = require("./visitors");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const visitorsApplier = code => {
  const result = [];
  (0, _traverse.default)(parser.parse(code, {
    sourceType: 'unambiguous',
    plugins: ['exportDefaultFrom']
  }), (0, _visitors.dependenciesVisitorsGenerator)(result));
  return result;
};

describe('Code Parser Visitors', () => {
  it('should get values from require', () => {
    const rawCode = `/*foo*/require('dep1'); const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
  });
  it('should get values from require.resolve', () => {
    const rawCode = `/*foo*/require.resolve('dep2'); const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep2');
  });
  it('should get values from import', () => {
    const rawCode = `/*foo*/import dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
    expect(foundDeps[1] === 'dep2');
  });
  it('should get values from export from', () => {
    const rawCode = `/*foo*/export dep1 from 'dep1'; import dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
  });
  it('should get values from export * from', () => {
    const rawCode = `/*foo*/export * from 'dep1'; export dep2 from 'dep2';const bar = 1;`;
    const foundDeps = visitorsApplier(rawCode);
    expect(foundDeps[0] === 'dep1');
    expect(foundDeps[1] === 'dep2');
  });
});