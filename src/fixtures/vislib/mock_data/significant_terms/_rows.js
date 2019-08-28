import _ from 'lodash';

export default {
  'rows': [
    {
      'label': 'h3: headings',
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
              'y': 128235
            },
            {
              'x': 'security',
              'y': 34518
            },
            {
              'x': 'error',
              'y': 10257
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
      'label': 'h5: headings',
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
              'y': 128235
            },
            {
              'x': 'security',
              'y': 34518
            },
            {
              'x': 'error',
              'y': 10257
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
      'label': 'http: headings',
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
              'y': 128235
            },
            {
              'x': 'security',
              'y': 34518
            },
            {
              'x': 'error',
              'y': 10257
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
      'label': 'success: headings',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 120689
            },
            {
              'x': 'info',
              'y': 107621
            },
            {
              'x': 'security',
              'y': 28916
            },
            {
              'x': 'error',
              'y': 8590
            },
            {
              'x': 'warning',
              'y': 14548
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
      'label': 'www.slate.com: headings',
      'xAxisLabel': 'Top 5 unusual terms in @tags',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'success',
              'y': 62292
            },
            {
              'x': 'info',
              'y': 55646
            },
            {
              'x': 'security',
              'y': 14823
            },
            {
              'x': 'error',
              'y': 4441
            },
            {
              'x': 'warning',
              'y': 7539
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
  'hits': 171445
};
