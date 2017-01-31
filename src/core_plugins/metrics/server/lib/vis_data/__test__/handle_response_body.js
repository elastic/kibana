import { expect } from 'chai';
import handleResponseBody from '../handle_response_body';
import response from './fixture.json';
const req = {
  'filters': [
    {
      'bool': {
        'must': [
          {
            'query_string': {
              'analyze_wildcard': true,
              'query': '*'
            }
          }
        ],
        'must_not': []
      }
    }
  ],
  'panels': [
    {
      'axis_formatter': 'number',
      'axis_position': 'left',
      'id': 'c9b5d2b0-e403-11e6-be91-6f7688e9fac7',
      'index_pattern': '*',
      'interval': 'auto',
      'series': [
        {
          'axis_position': 'right',
          'chart_type': 'line',
          'color': 'rgba(250,40,255,1)',
          'fill': 0,
          'formatter': 'number',
          'id': 'c9b5f9c0-e403-11e6-be91-6f7688e9fac7',
          'line_width': 1,
          'metrics': [
            {
              'field': 'system.cpu.system.pct',
              'id': 'c9b5f9c1-e403-11e6-be91-6f7688e9fac7',
              'type': 'avg'
            }
          ],
          'point_size': 1,
          'seperate_axis': 0,
          'split_mode': 'everything',
          'stacked': 0
        },
        {
          'axis_position': 'right',
          'chart_type': 'line',
          'color': '#68BC00',
          'fill': 0,
          'formatter': 'number',
          'id': 'f32b4bd0-e4c5-11e6-8f2c-fdc72dc2c8c0',
          'line_width': 1,
          'metrics': [
            {
              'field': 'system.cpu.user.pct',
              'id': 'f32b4bd1-e4c5-11e6-8f2c-fdc72dc2c8c0',
              'type': 'avg'
            }
          ],
          'point_size': 1,
          'seperate_axis': 0,
          'split_mode': 'everything',
          'stacked': 0
        }
      ],
      'show_legend': 1,
      'time_field': '@timestamp',
      'type': 'timeseries'
    }
  ],
  'timerange': {
    'max': '2017-01-27T21:34:36.635Z',
    'min': '2017-01-27T20:34:36.635Z'
  }
};

describe('handleResponseBody(req, panel, series)', () => {
  it('should return a valid set of series', () => {
    const panel = req.panels[0];
    const series = handleResponseBody(response, panel);
    expect(series).to.eql([]);
  });
});
