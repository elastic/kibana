import _ from 'lodash';

export default {
  'columns': [
    {
      'label': 'http: links',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 144000
            },
            {
              'x': 'info',
              'y': 128237
            },
            {
              'x': 'security',
              'y': 34518
            },
            {
              'x': 'error',
              'y': 10258
            },
            {
              'x': 'warning',
              'y': 17188
            }
          ]
        }
      ],
      'xAxisOrderedValues': ['success', 'info', 'security', 'error', 'warning'],
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
      'label': 'info: links',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 108148
            },
            {
              'x': 'info',
              'y': 96242
            },
            {
              'x': 'security',
              'y': 25889
            },
            {
              'x': 'error',
              'y': 7673
            },
            {
              'x': 'warning',
              'y': 12842
            }
          ]
        }
      ],
      'xAxisOrderedValues': ['success', 'info', 'security', 'error', 'warning'],
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
      'label': 'www.slate.com: links',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 98056
            },
            {
              'x': 'info',
              'y': 87344
            },
            {
              'x': 'security',
              'y': 23577
            },
            {
              'x': 'error',
              'y': 7004
            },
            {
              'x': 'warning',
              'y': 11759
            }
          ]
        }
      ],
      'xAxisOrderedValues': ['success', 'info', 'security', 'error', 'warning'],
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
      'label': 'twitter.com: links',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 74154
            },
            {
              'x': 'info',
              'y': 65963
            },
            {
              'x': 'security',
              'y': 17832
            },
            {
              'x': 'error',
              'y': 5258
            },
            {
              'x': 'warning',
              'y': 8906
            }
          ]
        }
      ],
      'xAxisOrderedValues': ['success', 'info', 'security', 'error', 'warning'],
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
      'label': 'www.www.slate.com: links',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 62591
            },
            {
              'x': 'info',
              'y': 55822
            },
            {
              'x': 'security',
              'y': 15100
            },
            {
              'x': 'error',
              'y': 4564
            },
            {
              'x': 'warning',
              'y': 7498
            }
          ]
        }
      ],
      'xAxisOrderedValues': ['success', 'info', 'security', 'error', 'warning'],
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
  'hits': 171446
};
