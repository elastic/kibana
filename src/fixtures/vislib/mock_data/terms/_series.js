import _ from 'lodash';

module.exports = {
  'label': '',
  'xAxisLabel': 'Top 5 extension',
  'yAxisLabel': 'Count of documents',
  'series': [
    {
      'label': 'Count',
      'values': [
        {
          'x': 'jpg',
          'y': 110710
        },
        {
          'x': 'css',
          'y': 27389
        },
        {
          'x': 'png',
          'y': 16661
        },
        {
          'x': 'gif',
          'y': 11269
        },
        {
          'x': 'php',
          'y': 5447
        }
      ]
    }
  ],
  'hits': 171476,
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
