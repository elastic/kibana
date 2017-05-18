const Type = require('../type');
const datatable = require('../datatable');

module.exports = new Type({
  name: 'pointseries',
  from: {
    null: () => {
      return {
        type: 'pointseries',
        rows: [],
        columns: [],
      };
    },
  },
  to: {
    render: (pointseries) => {
      return {
        type: 'render',
        as: 'table',
        value: datatable.from(pointseries),
      };
    },
  },
});
