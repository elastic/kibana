import _ from 'lodash';

module.exports = {
  'label': '',
  'xAxisLabel': 'filters',
  'yAxisLabel': 'Count of documents',
  'series': [
    {
      'label': 'Count',
      'values': [
        {
          'x': 'css',
          'y': 27374
        },
        {
          'x': 'html',
          'y': 0
        },
        {
          'x': 'png',
          'y': 16663
        }
      ]
    }
  ],
  'hits': 171454,
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
