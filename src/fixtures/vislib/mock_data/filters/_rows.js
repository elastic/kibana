import _ from 'lodash';

module.exports = {
  'rows': [
    {
      'label': '200: response',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 25260
            },
            {
              'x': 'png',
              'y': 15311
            }
          ]
        }
      ],
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
    },
    {
      'label': '404: response',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 1352
            },
            {
              'x': 'png',
              'y': 826
            }
          ]
        }
      ],
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
    },
    {
      'label': '503: response',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 761
            },
            {
              'x': 'png',
              'y': 527
            }
          ]
        }
      ],
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
    }
  ],
  'hits': 171443
};
