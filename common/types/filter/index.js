const Type = require('../type');

module.exports = new Type({
  name: 'filter',
  from: {
    null: () => {
      return {
        type: 'filter',
        size: null,
        sort: null,
        filter: null,
      };
    },
  },
  to: {},
});
