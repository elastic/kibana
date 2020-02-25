import _ from 'lodash';

export default {
  'label': '',
  'xAxisLabel': 'Top 5 unusual terms in @tags',
  'yAxisLabel': 'Count of documents',
  'series': [
    {
      'label': 'Count',
      'values': [
        {
          'x': 'success',
          'y': 143995
        },
        {
          'x': 'info',
          'y': 128233
        },
        {
          'x': 'security',
          'y': 34515
        },
        {
          'x': 'error',
          'y': 10256
        },
        {
          'x': 'warning',
          'y': 17188
        }
      ]
    }
  ],
  'hits': 171439,
  'xAxisFormatter': function (val) {
    if (_.isObject(val)) {
      return JSON.stringify(val);
    }
    else if (val == null) {
      return '';
    }
    else {
      return '' + val;
    }
  },
  'tooltipFormatter': function (d) {
    return d;
  }
};
