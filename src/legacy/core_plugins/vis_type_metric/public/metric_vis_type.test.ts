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

// TODO This is an integration test and thus requires a running platform. When moving to the new platform,
// this test has to be migrated to the newly created integration test environment.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { npStart } from 'ui/new_platform';
// @ts-ignore
import getStubIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

import { Vis } from '../../visualizations/public';
import { fieldFormats } from '../../../../plugins/data/public';
import {
  setup as visualizationsSetup,
  start as visualizationsStart,
} from '../../visualizations/public/np_ready/public/legacy';
import { createMetricVisTypeDefinition } from './metric_vis_type';

jest.mock('ui/new_platform');

describe('metric_vis - createMetricVisTypeDefinition', () => {
  let vis: Vis;

  beforeAll(() => {
    visualizationsSetup.types.createReactVisualization(createMetricVisTypeDefinition());
    (npStart.plugins.data.fieldFormats.getType as jest.Mock).mockImplementation(() => {
      return fieldFormats.UrlFormat;
    });
    (npStart.plugins.data.fieldFormats.deserialize as jest.Mock).mockImplementation(mapping => {
      return new fieldFormats.UrlFormat(mapping ? mapping.params : {});
    });
  });

  const setup = () => {
    const stubIndexPattern = getStubIndexPattern();

    stubIndexPattern.stubSetFieldFormat('ip', 'url', {
      urlTemplate: 'http://ip.info?address={{value}}',
      labelTemplate: 'ip[{{value}}]',
    });

    // TODO: remove when Vis is converted to typescript. Only importing Vis as type
    // @ts-ignore
    vis = new visualizationsStart.Vis(stubIndexPattern, {
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
    const metricVisType = visualizationsStart.types.get('metric');
    const Controller = metricVisType.visualization;
    const controller = new Controller(el, vis);
    const render = (esResponse: any) => {
      controller.render(esResponse, vis.params);
    };

    return { el, render };
  };

  it('renders html value from field formatter', () => {
    const { el, render } = setup();

    const ip = '235.195.237.208';
    render({
      columns: [{ id: 'col-0', name: 'ip' }],
      rows: [{ 'col-0': ip }],
    });

    const links = $(el)
      .find('a[href]')
      .filter(function() {
        // @ts-ignore
        return this.href.includes('ip.info');
      });

    expect(links.length).toBe(1);
    expect(links.text()).toBe(`ip[${ip}]`);
  });
});
