var moment = require('moment');

module.exports = {
  'columns': [
    {
      'label': '200: response',
      'xAxisLabel': '@timestamp per 30 sec',
      'ordered': {
        'date': true,
        'interval': 30000,
        'min': 1415826608440,
        'max': 1415827508440
      },
      'yAxisLabel': 'Count of documents',
      'xAxisFormatter': function (thing) {
        return moment(thing);
      },
      'tooltipFormatter': function (d) {
        return d;
      },
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 1415826600000,
              'y': 4
            },
            {
              'x': 1415826630000,
              'y': 8
            },
            {
              'x': 1415826660000,
              'y': 7
            },
            {
              'x': 1415826690000,
              'y': 5
            },
            {
              'x': 1415826720000,
              'y': 5
            },
            {
              'x': 1415826750000,
              'y': 4
            },
            {
              'x': 1415826780000,
              'y': 10
            },
            {
              'x': 1415826810000,
              'y': 7
            },
            {
              'x': 1415826840000,
              'y': 9
            },
            {
              'x': 1415826870000,
              'y': 8
            },
            {
              'x': 1415826900000,
              'y': 9
            },
            {
              'x': 1415826930000,
              'y': 8
            },
            {
              'x': 1415826960000,
              'y': 3
            },
            {
              'x': 1415826990000,
              'y': 9
            },
            {
              'x': 1415827020000,
              'y': 6
            },
            {
              'x': 1415827050000,
              'y': 8
            },
            {
              'x': 1415827080000,
              'y': 7
            },
            {
              'x': 1415827110000,
              'y': 4
            },
            {
              'x': 1415827140000,
              'y': 6
            },
            {
              'x': 1415827170000,
              'y': 10
            },
            {
              'x': 1415827200000,
              'y': 2
            },
            {
              'x': 1415827230000,
              'y': 8
            },
            {
              'x': 1415827260000,
              'y': 5
            },
            {
              'x': 1415827290000,
              'y': 6
            },
            {
              'x': 1415827320000,
              'y': 6
            },
            {
              'x': 1415827350000,
              'y': 10
            },
            {
              'x': 1415827380000,
              'y': 6
            },
            {
              'x': 1415827410000,
              'y': 6
            },
            {
              'x': 1415827440000,
              'y': 12
            },
            {
              'x': 1415827470000,
              'y': 9
            },
            {
              'x': 1415827500000,
              'y': 1
            }
          ]
        }
      ]
    },
    {
      'label': '503: response',
      'xAxisLabel': '@timestamp per 30 sec',
      'ordered': {
        'date': true,
        'interval': 30000,
        'min': 1415826608440,
        'max': 1415827508440
      },
      'yAxisLabel': 'Count of documents',
      'xAxisFormatter': function (thing) {
        return moment(thing);
      },
      'tooltipFormatter': function (d) {
        return d;
      },
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 1415826630000,
              'y': 1
            },
            {
              'x': 1415826660000,
              'y': 1
            },
            {
              'x': 1415826720000,
              'y': 1
            },
            {
              'x': 1415826780000,
              'y': 1
            },
            {
              'x': 1415826900000,
              'y': 1
            },
            {
              'x': 1415827020000,
              'y': 1
            },
            {
              'x': 1415827080000,
              'y': 1
            },
            {
              'x': 1415827110000,
              'y': 2
            }
          ]
        }
      ]
    },
    {
      'label': '404: response',
      'xAxisLabel': '@timestamp per 30 sec',
      'ordered': {
        'date': true,
        'interval': 30000,
        'min': 1415826608440,
        'max': 1415827508440
      },
      'yAxisLabel': 'Count of documents',
      'xAxisFormatter': function (thing) {
        return moment(thing);
      },
      'tooltipFormatter': function (d) {
        return d;
      },
      'series': [
        {
          'label': 'Count',
          'values': [
            {
              'x': 1415826660000,
              'y': 1
            },
            {
              'x': 1415826720000,
              'y': 1
            },
            {
              'x': 1415826810000,
              'y': 1
            },
            {
              'x': 1415826960000,
              'y': 1
            },
            {
              'x': 1415827050000,
              'y': 1
            },
            {
              'x': 1415827260000,
              'y': 1
            },
            {
              'x': 1415827380000,
              'y': 1
            },
            {
              'x': 1415827410000,
              'y': 1
            }
          ]
        }
      ]
    }
  ],
  'hits': 225
};
