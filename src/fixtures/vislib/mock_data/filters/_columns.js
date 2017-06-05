import _ from 'lodash';

module.exports = {
  'columns': [
    {
      'label': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1: agent.raw',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 10379
            },
            {
              'x': 'png',
              'y': 6395
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
      'label': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24: agent.raw',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 9253
            },
            {
              'x': 'png',
              'y': 5571
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
      'label': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322): agent.raw',
      'xAxisLabel': 'filters',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 'css',
              'y': 7740
            },
            {
              'x': 'png',
              'y': 4697
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
