import _ from 'lodash';

module.exports = {
  'label': '',
  'xAxisLabel': '',
  'yAxisLabel': 'Count of documents',
  'series': [
    {
      'label': 'Count',
      'values': [
        {
          'x': '_all',
          'y': 274
        }
      ]
    }
  ],
  'hits': 274,
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
