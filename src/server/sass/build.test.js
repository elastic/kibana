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

import sass from 'node-sass';
import { Build } from './build';

jest.mock('node-sass');

describe('SASS builder', () => {
  jest.mock('fs');

  it('generates a glob', () => {
    const builder = new Build('/foo/style.sass');
    expect(builder.getGlob()).toEqual('/foo/**/*.s{a,c}ss');
  });

  it('builds SASS', () => {
    sass.render.mockImplementation(() => Promise.resolve(null, { css: 'test' }));
    const builder = new Build('/foo/style.sass');
    builder.build();

    expect(sass.render.mock.calls[0][0]).toEqual({
      file: '/foo/style.sass',
      outFile: '/foo/style.css',
      sourceComments: true,
      sourceMap: true,
      sourceMapEmbed: true
    });
  });

  it('has an output file with a different extension', () => {
    const builder = new Build('/foo/style.sass');
    expect(builder.outputPath()).toEqual('/foo/style.css');
  });
});