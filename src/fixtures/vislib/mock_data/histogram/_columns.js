import _ from 'lodash';

export default {
  'columns': [
    {
      'label': '404: response',
      'xAxisLabel': 'machine.ram',
      'ordered': {
        'interval': 100
      },
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 2147483600,
              'y': 1,
              'y0': 0
            },
            {
              'x': 3221225400,
              'y': 0,
              'y0': 0
            },
            {
              'x': 4294967200,
              'y': 0,
              'y0': 0
            },
            {
              'x': 5368709100,
              'y': 0,
              'y0': 0
            },
            {
              'x': 6442450900,
              'y': 0,
              'y0': 0
            },
            {
              'x': 7516192700,
              'y': 0,
              'y0': 0
            },
            {
              'x': 8589934500,
              'y': 0,
              'y0': 0
            },
            {
              'x': 10737418200,
              'y': 0,
              'y0': 0
            },
            {
              'x': 11811160000,
              'y': 0,
              'y0': 0
            },
            {
              'x': 12884901800,
              'y': 1,
              'y0': 0
            },
            {
              'x': 13958643700,
              'y': 0,
              'y0': 0
            },
            {
              'x': 15032385500,
              'y': 0,
              'y0': 0
            },
            {
              'x': 16106127300,
              'y': 0,
              'y0': 0
            },
            {
              'x': 18253611000,
              'y': 0,
              'y0': 0
            },
            {
              'x': 19327352800,
              'y': 0,
              'y0': 0
            },
            {
              'x': 20401094600,
              'y': 0,
              'y0': 0
            },
            {
              'x': 21474836400,
              'y': 0,
              'y0': 0
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
      'label': '200: response',
      'xAxisLabel': 'machine.ram',
      'ordered': {
        'interval': 100
      },
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 2147483600,
              'y': 0,
              'y0': 0
            },
            {
              'x': 3221225400,
              'y': 2,
              'y0': 0
            },
            {
              'x': 4294967200,
              'y': 3,
              'y0': 0
            },
            {
              'x': 5368709100,
              'y': 3,
              'y0': 0
            },
            {
              'x': 6442450900,
              'y': 1,
              'y0': 0
            },
            {
              'x': 7516192700,
              'y': 1,
              'y0': 0
            },
            {
              'x': 8589934500,
              'y': 4,
              'y0': 0
            },
            {
              'x': 10737418200,
              'y': 0,
              'y0': 0
            },
            {
              'x': 11811160000,
              'y': 1,
              'y0': 0
            },
            {
              'x': 12884901800,
              'y': 1,
              'y0': 0
            },
            {
              'x': 13958643700,
              'y': 1,
              'y0': 0
            },
            {
              'x': 15032385500,
              'y': 2,
              'y0': 0
            },
            {
              'x': 16106127300,
              'y': 3,
              'y0': 0
            },
            {
              'x': 18253611000,
              'y': 4,
              'y0': 0
            },
            {
              'x': 19327352800,
              'y': 5,
              'y0': 0
            },
            {
              'x': 20401094600,
              'y': 2,
              'y0': 0
            },
            {
              'x': 21474836400,
              'y': 2,
              'y0': 0
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
      'xAxisLabel': 'machine.ram',
      'ordered': {
        'interval': 100
      },
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 2147483600,
              'y': 0,
              'y0': 0
            },
            {
              'x': 3221225400,
              'y': 0,
              'y0': 0
            },
            {
              'x': 4294967200,
              'y': 0,
              'y0': 0
            },
            {
              'x': 5368709100,
              'y': 0,
              'y0': 0
            },
            {
              'x': 6442450900,
              'y': 0,
              'y0': 0
            },
            {
              'x': 7516192700,
              'y': 0,
              'y0': 0
            },
            {
              'x': 8589934500,
              'y': 0,
              'y0': 0
            },
            {
              'x': 10737418200,
              'y': 1,
              'y0': 0
            },
            {
              'x': 11811160000,
              'y': 0,
              'y0': 0
            },
            {
              'x': 12884901800,
              'y': 0,
              'y0': 0
            },
            {
              'x': 13958643700,
              'y': 0,
              'y0': 0
            },
            {
              'x': 15032385500,
              'y': 0,
              'y0': 0
            },
            {
              'x': 16106127300,
              'y': 0,
              'y0': 0
            },
            {
              'x': 18253611000,
              'y': 0,
              'y0': 0
            },
            {
              'x': 19327352800,
              'y': 0,
              'y0': 0
            },
            {
              'x': 20401094600,
              'y': 0,
              'y0': 0
            },
            {
              'x': 21474836400,
              'y': 0,
              'y0': 0
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
  'xAxisOrderedValues': [
    2147483600,
    3221225400,
    4294967200,
    5368709100,
    6442450900,
    7516192700,
    8589934500,
    10737418200,
    11811160000,
    12884901800,
    13958643700,
    15032385500,
    16106127300,
    18253611000,
    19327352800,
    20401094600,
    21474836400,
  ],
  'hits': 40
};
