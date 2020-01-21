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

const { RuleTester } = require('eslint');
const parser = require('@typescript-eslint/parser');
const rule = require('../no-memo-displayname');

const tester = new RuleTester({
  parser: parser,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 6,
    jsx: true,
  },
});

tester.run('no-memo-displayname', rule, {
  valid: [
    {
      code: `
        const ReactMemoComponent = () => null;
        ReactMemoComponent.displayName = 'ReactMemoComponent'
        const ReactMemo = React.memo(ReactMemoComponent);
    `,
    },
    {
      code: `
        const ReactMemoComponent = () => null;
        ReactMemoComponent.displayName = 'ReactMemoComponent'
        export const ReactMemo = React.memo(ReactMemoComponent);
    `,
    },
    {
      code: `
        const ReactMemoComponent = () => null;
        ReactMemoComponent.displayName = 'ReactMemoComponent'
        const ReactMemo = memo(ReactMemoComponent);
    `,
    },
    {
      code: `
        const ReactMemoComponent = () => null;
        ReactMemoComponent.displayName = 'ReactMemoComponent'
        export const ReactMemo = memo(ReactMemoComponent);
    `,
    },
  ],
  invalid: [
    {
      code: `
        const ReactMemoComponent = () => null;
        const ReactMemo = React.memo(ReactMemoComponent);
        ReactMemo.displayName = 'ReactMemo';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        const ReactMemoComponent = () => null;
        export const ReactMemo = React.memo(ReactMemoComponent);
        ReactMemo.displayName = 'ReactMemo';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        const ReactMemoComponent = React.memo(() => null);
        ReactMemoComponent.displayName = 'ReactMemoComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        export const ReactMemoComponent = React.memo(() => null);
        ReactMemoComponent.displayName = 'ReactMemoComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        const ReactMemoTSComponent = React.memo<{}>(() => null);
        ReactMemoTSComponent.displayName = 'ReactMemoTSComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        export const ReactMemoTSComponent = React.memo(() => null);
        ReactMemoTSComponent.displayName = 'ReactMemoTSComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        const MemoComponent = memo(() => null);
        MemoComponent.displayName = 'MemoComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        export const MemoComponent = memo(() => null);
        MemoComponent.displayName = 'MemoComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        const MemoTSComponent = memo<{}>(() => null);
        MemoTSComponent.displayName = 'MemoTSComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
    {
      code: `
        export const MemoTSComponent = memo<{}>(() => null);
        MemoTSComponent.displayName = 'MemoTSComponent';
      `,
      errors: [{ message: "Do not set 'displayName' on memo() component" }],
    },
  ],
});
