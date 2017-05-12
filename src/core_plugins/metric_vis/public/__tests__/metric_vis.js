import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import { VisProvider } from 'ui/vis';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import MetricVisProvider from '../metric_vis';

describe('metric_vis', () => {
  let setup = null;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $rootScope) => {
    setup = () => {
      const Vis = Private(VisProvider);
      const metricVisType = Private(MetricVisProvider);
      const indexPattern = Private(LogstashIndexPatternStubProvider);

      indexPattern.stubSetFieldFormat('ip', 'url', {
        urlTemplate: 'http://ip.info?address={{value}}',
        labelTemplate: 'ip[{{value}}]'
      });

      const vis = new Vis(indexPattern, {
        type: 'metric',
        aggs: [{ id: '1', type: 'top_hits', schema: 'metric', params: { field: 'ip' } }],
      });

      const $el = $('<div>');
      const renderbot = metricVisType.createRenderbot(vis, $el);
      const render = (esResponse) => {
        renderbot.render(esResponse);
        $rootScope.$digest();
      };

      return { $el, render };
    };
  }));

  it('renders html value from field formatter', () => {
    const { $el, render } = setup();

    const ip = '235.195.237.208';
    render({
      hits: { total: 0, hits: [] },
      aggregations: {
        '1': {
          hits: { total: 1, hits: [{ _source: { ip } }] }
        }
      }
    });

    const $link = $el
      .find('a[href]')
      .filter(function () { return this.href.includes('ip.info'); });

    expect($link).to.have.length(1);
    expect($link.text()).to.be(`ip[${ip}]`);
  });
});
