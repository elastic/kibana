import _ from 'lodash';

export default {
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
  'xAxisOrderedValues': ['_all'],
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
