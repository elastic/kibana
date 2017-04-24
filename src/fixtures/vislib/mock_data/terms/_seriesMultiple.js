import _ from 'lodash';

module.exports = {
  'yAxisLabel': 'Count',
  'zAxisLabel': 'machine.os.raw: Descending',
  'yScale': null,
  'series': [{
    'label': 'ios',
    'aggLabel': 'Count',
    'aggId': '1',
    'values': [{
      'x': '_all',
      'y': 2820,
      'series': 'ios'
    }]
  }, {
    'label': 'win 7',
    'aggLabel': 'Count',
    'aggId': '1',
    'values': [{
      'x': '_all',
      'y': 2319,
      'series': 'win 7'
    }]
  }, {
    'label': 'win 8',
    'aggLabel': 'Count',
    'aggId': '1',
    'values': [{
      'x': '_all',
      'y': 1835,
      'series': 'win 8'
    }]
  }, {
    'label': 'win xp',
    'aggLabel': 'Count',
    'aggId': '1',
    'values': [{
      'x': '_all',
      'y': 734,
      'series': 'win xp'
    }]
  }, {
    'label': 'osx',
    'aggLabel': 'Count',
    'aggId': '1',
    'values': [{
      'x': '_all',
      'y': 1352,
      'series': 'osx'
    }]
  }],
  'hits': 14005,
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
  'yAxisFormatter': function (val) {
    return val;
  },
  'tooltipFormatter': function (d) {
    return d;
  }
};
