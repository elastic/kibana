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

/* eslint-disable max-len */

import { createAbsolutePathSerializer, REPO_ROOT } from '@kbn/dev-utils';

import jestPreset from './jest_preset';

expect.addSnapshotSerializer(createAbsolutePathSerializer(REPO_ROOT));

it('produces the expected preset', () => {
  expect(jestPreset()).toMatchInlineSnapshot(`
    Object {
      "overrides": Array [
        Object {
          "plugins": Array [
            <absolute path>/node_modules/babel-plugin-typescript-strip-namespaces/index.js,
          ],
          "test": Array [
            "x-pack/legacy/plugins/infra/**/graphql",
            "x-pack/legacy/plugins/siem/**/graphql",
          ],
        },
      ],
      "plugins": Array [
        <absolute path>/packages/kbn-elastic-idx/babel/index.js,
        <absolute path>/node_modules/babel-plugin-add-module-exports/lib/index.js,
        <absolute path>/node_modules/@babel/plugin-proposal-class-properties/lib/index.js,
        <absolute path>/node_modules/@babel/plugin-syntax-dynamic-import/lib/index.js,
        <absolute path>/node_modules/babel-plugin-dynamic-import-node/lib/index.js,
      ],
      "presets": Array [
        <absolute path>/node_modules/@babel/preset-typescript/lib/index.js,
        <absolute path>/node_modules/@babel/preset-react/lib/index.js,
        Array [
          <absolute path>/node_modules/@babel/preset-env/lib/index.js,
          Object {
            "modules": "cjs",
            "targets": Object {
              "node": "current",
            },
          },
        ],
      ],
    }
  `);
});
