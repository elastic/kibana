import _ from 'lodash';

export default {
  'columns': [
    {
      'label': 'logstash: index',
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
              'y': 27376
            },
            {
              'x': 'png',
              'y': 16664
            },
            {
              'x': 'gif',
              'y': 11264
            },
            {
              'x': 'php',
              'y': 5448
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
      'label': '2014.11.12: index',
      'xAxisLabel': 'Top 5 extension',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'jpg',
              'y': 110643
            },
            {
              'x': 'css',
              'y': 27350
            },
            {
              'x': 'png',
              'y': 16648
            },
            {
              'x': 'gif',
              'y': 11257
            },
            {
              'x': 'php',
              'y': 5440
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
      'label': '2014.11.11: index',
      'xAxisLabel': 'Top 5 extension',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'jpg',
              'y': 67
            },
            {
              'x': 'css',
              'y': 26
            },
            {
              'x': 'png',
              'y': 16
            },
            {
              'x': 'gif',
              'y': 7
            },
            {
              'x': 'php',
              'y': 8
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
  'xAxisOrderedValues': ['jpg', 'css', 'png', 'gif', 'php'],
  'hits': 171462
};
