var Promise = require('bluebird');

module.exports = function () {
  return {
    type: 'seriesList',
    list: [{
      data:  [
        [1000, -51],
        [2000, 17],
        [3000, 82],
        [4000, 20],
      ],
      type: 'series',
      label: 'Negative'
    }, {
      data:  [
        [1000, 100],
        [2000, 50],
        [3000, 50],
        [4000, 20],
      ],
      type: 'series',
      label: 'Nice'
    },
    {
      data:  [
        [1000, 1],
        [2000, 1],
        [3000, 1],
        [4000, 1],
      ],
      type: 'series',
      label: 'All the same'
    },
    {
      data:  [
        [1000, 3.1415926535],
        [2000, 2],
        [3000, 1.439],
        [4000, 0.3424235],
      ],
      type: 'series',
      label: 'Decimauled'
    }]
  };
};
