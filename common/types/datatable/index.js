const Type = require('../type');

module.exports = new Type({
  name: 'datatable',
  from: {
    null: () => {
      return {
        /*
          columns: [
            {name: 'foo', type: 'boolean', role: 'dimension'},
            {name: 'bar', type: 'number',  role: 'measure'},
            {name: 'baz', type: 'string',  role: 'dimension'}
          ],
          rows: [{foo: true, bar: 10, baz: 'awesome'}]
        */
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
