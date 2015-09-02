var Promise = require('bluebird');

module.exports = Promise.resolve({
  type: 'seriesList',
  list: [{
    data:  [
      [1000, 51],
      [2000, 17],
      [3000, 82],
      [4000, 20],
    ],
    type: 'series',
    label: 'test series one'
  }]
});