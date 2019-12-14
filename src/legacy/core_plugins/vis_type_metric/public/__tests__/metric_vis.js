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

import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';

import { VisProvider } from 'ui/vis';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';

import { createMetricVisTypeDefinition } from '../metric_vis_type';

describe('metric_vis - createMetricVisTypeDefinition', () => {
  let setup = null;
  let vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(Private => {
      setup = () => {
        const Vis = Private(VisProvider);
        const metricVisType = createMetricVisTypeDefinition();
        const indexPattern = Private(LogstashIndexPatternStubProvider);

        indexPattern.stubSetFieldFormat('ip', 'url', {
          urlTemplate: 'http://ip.info?address={{value}}',
          labelTemplate: 'ip[{{value}}]',
        });

        vis = new Vis(indexPattern, {
          type: 'metric',
          aggs: [{ id: '1', type: 'top_hits', schema: 'metric', params: { field: 'ip' } }],
        });

        vis.params.dimensions = {
          metrics: [
            {
              accessor: 0,
              format: {
                id: 'url',
                params: {
                  urlTemplate: 'http://ip.info?address={{value}}',
                  labelTemplate: 'ip[{{value}}]',
                },
              },
            },
          ],
        };

        const el = document.createElement('div');
        const Controller = metricVisType.visualization;
        const controller = new Controller(el, vis);
        const render = esResponse => {
          controller.render(esResponse, vis.params);
        };

        return { el, render };
      };
    })
  );

  it('renders html value from field formatter', () => {
    const { el, render } = setup();

    const ip = '235.195.237.208';
    render({
      columns: [{ id: 'col-0', name: 'ip' }],
      rows: [{ 'col-0': ip }],
    });

    const $link = $(el)
      .find('a[href]')
      .filter(function() {
        return this.href.includes('ip.info');
      });

    expect($link).to.have.length(1);
    expect($link.text()).to.be(`ip[${ip}]`);
  });
});
