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
import { callPluginHook } from './call_plugin_hook';

describe('server/plugins/callPluginHook', () => {
  it('should call in correct order based on requirements', async () => {
    const plugins = [
      {
        id: 'foo',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar', 'baz'],
      },
      {
        id: 'bar',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: [],
      },
      {
        id: 'baz',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar'],
      },
    ];

    await callPluginHook('init', plugins, 'foo', []);
    const [foo, bar, baz] = plugins;
    sinon.assert.calledOnce(foo.init);
    sinon.assert.calledTwice(bar.init);
    sinon.assert.calledOnce(baz.init);
    sinon.assert.callOrder(bar.init, baz.init, foo.init);
  });

  it('throws meaningful error when required plugin is missing', async () => {
    const plugins = [
      {
        id: 'foo',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar'],
      },
    ];

    try {
      await callPluginHook('init', plugins, 'foo', []);
      throw new Error('expected callPluginHook to throw');
    } catch (error) {
      expect(error.message).toContain('"bar" for plugin "foo"');
    }
  });

  it('throws meaningful error when dependencies are circular', async () => {
    const plugins = [
      {
        id: 'foo',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['bar'],
      },
      {
        id: 'bar',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['baz'],
      },
      {
        id: 'baz',
        init: sinon.spy(),
        preInit: sinon.spy(),
        requiredIds: ['foo'],
      },
    ];

    try {
      await callPluginHook('init', plugins, 'foo', []);
      throw new Error('expected callPluginHook to throw');
    } catch (error) {
      expect(error.message).toContain('foo -> bar -> baz -> foo');
    }
  });
});
