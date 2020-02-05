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

import expect from '@kbn/expect';
import sinon from 'sinon';

import { PluginPack } from '../../plugin_pack';
import { getSettings } from '../settings';

describe('plugin_discovery/settings', () => {
  const pluginSpec = new PluginPack({
    path: '/dev/null',
    pkg: {
      name: 'test',
      version: 'kibana',
    },
    provider: ({ Plugin }) =>
      new Plugin({
        configPrefix: 'a.b.c',
        deprecations: ({ rename }) => [rename('foo', 'bar')],
      }),
  })
    .getPluginSpecs()
    .pop();

  describe('getSettings()', () => {
    it('reads settings from config prefix', async () => {
      const rootSettings = {
        a: {
          b: {
            c: {
              enabled: false,
            },
          },
        },
      };

      expect(await getSettings(pluginSpec, rootSettings)).to.eql({
        enabled: false,
      });
    });

    it('allows rootSettings to be undefined', async () => {
      expect(await getSettings(pluginSpec)).to.eql(undefined);
    });

    it('resolves deprecations', async () => {
      const logDeprecation = sinon.stub();
      expect(
        await getSettings(
          pluginSpec,
          {
            a: {
              b: {
                c: {
                  foo: true,
                },
              },
            },
          },
          logDeprecation
        )
      ).to.eql({
        bar: true,
      });

      sinon.assert.calledOnce(logDeprecation);
    });
  });
});
