const Type = require('../type');

module.exports = new Type({
  name: 'query',
  from: {
    null: () => {
      return {
        type: 'query',
        meta: null,
        size: null,
        sort: null,
        and: [],
      };
    },
  },
  to: {},
});
