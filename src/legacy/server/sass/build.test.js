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

import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import globby from 'globby';

import del from 'del';

import { Build } from './build';

const TMP = resolve(__dirname, '__tmp__');
const FIXTURE = resolve(__dirname, '__fixtures__/index.scss');

afterEach(async () => {
  await del(TMP);
});

it('builds light themed SASS', async () => {
  const targetPath = resolve(TMP, 'style.css');
  await new Build({
    sourcePath: FIXTURE,
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    theme: 'light',
    targetPath,
  }).build();

  expect(readFileSync(targetPath, 'utf8').replace(/(\/\*# sourceMappingURL=).*( \*\/)/, '$1...$2'))
    .toMatchInlineSnapshot(`
    "/* 1 */
    /* 1 */
    /**
     * 1. Extend beta badges to at least 40% of the container's width
     * 2. Fix for IE to ensure badges are visible outside of a <button> tag
     */
    /**
     * 1. Apply margin to all but last item in the flex.
     * 2. Margin gets flipped because of the row-reverse.
     */
    /**
     * 3. Must supply both values to background-size or some browsers apply the single value to both directions
     */
    /**
     * 4. Override invalid state with focus state.
     */
    /**
     *  Mixin for use in:
     *  - EuiCard
     *  - EuiPageContent
    */
    foo bar {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      background: #e6f0f8 url(./images/img.png) url(ui/assets/favicons/favicon.ico); }
    /*# sourceMappingURL=... */"
  `);
});

it('builds dark themed SASS', async () => {
  const targetPath = resolve(TMP, 'style.css');
  await new Build({
    sourcePath: FIXTURE,
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    theme: 'dark',
    targetPath,
  }).build();

  expect(readFileSync(targetPath, 'utf8').replace(/(\/\*# sourceMappingURL=).*( \*\/)/, '$1...$2'))
    .toMatchInlineSnapshot(`
    "/* 1 */
    /* 1 */
    /**
     * 1. Extend beta badges to at least 40% of the container's width
     * 2. Fix for IE to ensure badges are visible outside of a <button> tag
     */
    /**
     * 1. Apply margin to all but last item in the flex.
     * 2. Margin gets flipped because of the row-reverse.
     */
    /**
     * 3. Must supply both values to background-size or some browsers apply the single value to both directions
     */
    /**
     * 4. Override invalid state with focus state.
     */
    /**
     *  Mixin for use in:
     *  - EuiCard
     *  - EuiPageContent
    */
    foo bar {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      background: #232635 url(./images/img.png) url(ui/assets/favicons/favicon.ico); }
    /*# sourceMappingURL=... */"
  `);
});

it('rewrites url imports', async () => {
  const targetPath = resolve(TMP, 'style.css');
  await new Build({
    sourcePath: FIXTURE,
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    theme: 'dark',
    targetPath,
    urlImports: {
      publicDir: dirname(FIXTURE),
      urlBase: 'foo/bar',
    },
  }).build();

  expect(readFileSync(targetPath, 'utf8').replace(/(\/\*# sourceMappingURL=).*( \*\/)/, '$1...$2'))
    .toMatchInlineSnapshot(`
    "/* 1 */
    /* 1 */
    /**
     * 1. Extend beta badges to at least 40% of the container's width
     * 2. Fix for IE to ensure badges are visible outside of a <button> tag
     */
    /**
     * 1. Apply margin to all but last item in the flex.
     * 2. Margin gets flipped because of the row-reverse.
     */
    /**
     * 3. Must supply both values to background-size or some browsers apply the single value to both directions
     */
    /**
     * 4. Override invalid state with focus state.
     */
    /**
     *  Mixin for use in:
     *  - EuiCard
     *  - EuiPageContent
    */
    foo bar {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      background: #232635 url(__REPLACE_WITH_PUBLIC_PATH__foo/bar/images/img.png) url(__REPLACE_WITH_PUBLIC_PATH__ui/favicons/favicon.ico); }
    /*# sourceMappingURL=... */"
  `);

  expect(
    Buffer.compare(
      readFileSync(resolve(TMP, 'images/img.png')),
      readFileSync(resolve(dirname(FIXTURE), 'images/img.png'))
    )
  ).toBe(0);

  expect(await globby('**/*', { cwd: TMP })).toMatchInlineSnapshot(`
    Array [
      "style.css",
      "images/img.png",
    ]
  `);
});
