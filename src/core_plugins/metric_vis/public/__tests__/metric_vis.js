import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import { VisProvider } from 'ui/vis';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import MetricVisProvider from '../metric_vis';

describe('metric_vis', () => {
  let setup = null;
  let vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private) => {
    setup = () => {
      const Vis = Private(VisProvider);
      const metricVisType = Private(MetricVisProvider);
      const indexPattern = Private(LogstashIndexPatternStubProvider);

      indexPattern.stubSetFieldFormat('ip', 'url', {
        urlTemplate: 'http://ip.info?address={{value}}',
        labelTemplate: 'ip[{{value}}]'
      });

      vis = new Vis(indexPattern, {
        type: 'metric',
        aggs: [{ id: '1', type: 'top_hits', schema: 'metric', params: { field: 'ip' } }],
      });

      const el = document.createElement('div');
      const Controller = metricVisType.visualization;
      const controller = new Controller(el, vis);
      const render = (esResponse) => {
        controller.render(esResponse);
      };

      return { el, render };
    };
  }));

  it('renders html value from field formatter', () => {
    const { el, render } = setup();

    const ip = '235.195.237.208';
    render({
      tables: [{
        columns: [{ title: 'ip', aggConfig: vis.aggs[0] }],
        rows: [[ ip ]]
      }]
    });

    const $link = $(el)
      .find('a[href]')
      .filter(function () { return this.href.includes('ip.info'); });

    expect($link).to.have.length(1);
    expect($link.text()).to.be(`ip[${ip}]`);
  });
});
