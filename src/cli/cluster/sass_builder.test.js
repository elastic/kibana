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
import sass from 'node-sass';
import { SassBuilder } from './sass_builder';

describe('SASS builder', () => {
  const sandbox = sinon.createSandbox();

  it('generates a glob', () => {
    const builder = new SassBuilder('/foo/style.sass');
    expect(builder.getGlob()).toEqual('/foo/**/*.s{a,c}ss');
  });

  it('adds a watch for SASS files on the basePath', () => {
    const watcher = {
      add: sinon.stub(),
    };
    const builder = new SassBuilder('/foo/style.sass', {
      watcher,
    });

    builder.addToWatcher();

    sinon.assert.calledOnce(watcher.add);
    sinon.assert.calledWithExactly(watcher.add, builder.getGlob());
  });

  it('builds SASS', () => {
    sandbox.stub(sass, 'renderSync').callsFake(() => {
      return { css: 'test' };
    });

    const builder = new SassBuilder('/foo/style.sass');
    builder.build();

    sinon.assert.calledOnce(sass.renderSync);
    sinon.assert.calledWithExactly(sass.renderSync,  {
      file: '/foo/style.sass',
      outFile: '/foo/style.css',
      sourceComments: true,
      sourceMap: true,
      sourceMapEmbed: true
    });
  });

  it('has an output file with a different extension', () => {
    const builder = new SassBuilder('/foo/style.sass');
    expect(builder.outputPath()).toEqual('/foo/style.css');
  });
});