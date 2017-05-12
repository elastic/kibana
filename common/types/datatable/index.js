const Type = require('../type');

module.exports = new Type({
  name: 'datatable',
  from: {
    null: () => {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    },
  },
  to: {
    render: (datatable) => {
      return {
        type: 'render',
        as: 'table',
        value: datatable,
      };
    },
  },
});
