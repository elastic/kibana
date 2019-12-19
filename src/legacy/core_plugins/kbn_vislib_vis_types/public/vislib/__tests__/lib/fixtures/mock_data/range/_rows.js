import _ from 'lodash';

export default {
  'rows': [
    {
      'label': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1: agent.raw',
      'xAxisLabel': 'bytes ranges',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': '0.0-1000.0',
              'y': 6422,
              'y0': 0
            },
            {
              'x': '1000.0-2000.0',
              'y': 3446,
              'y0': 0
            }
          ]
        }
      ]
    },
    {
      'label': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24: agent.raw',
      'xAxisLabel': 'bytes ranges',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': '0.0-1000.0',
              'y': 5430,
              'y0': 0
            },
            {
              'x': '1000.0-2000.0',
              'y': 3010,
              'y0': 0
            }
          ]
        }
      ]
    },
    {
      'label': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322): agent.raw',
      'xAxisLabel': 'bytes ranges',
      'yAxisLabel': 'Count of documents',
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': '0.0-1000.0',
              'y': 4735,
              'y0': 0
            },
            {
              'x': '1000.0-2000.0',
              'y': 2542,
              'y0': 0
            }
          ]
        }
      ]
    }
  ],
  'hits': 171501,
  'xAxisOrderedValues': ['0.0-1000.0', '1000.0-2000.0'],
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
