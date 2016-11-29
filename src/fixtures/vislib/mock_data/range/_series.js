import _ from 'lodash';

module.exports = {
  'label': '',
  'xAxisLabel': 'bytes ranges',
  'yAxisLabel': 'Count of documents',
  'series': [
    {
      'label': 'Count',
      'values': [
        {
          'x': '0.0-1000.0',
          'y': 16576
        },
        {
          'x': '1000.0-2000.0',
          'y': 9005
        }
      ]
    }
  ],
  'hits': 171500,
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
