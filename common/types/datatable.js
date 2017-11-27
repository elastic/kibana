import { map } from 'lodash';

export const datatable = {
  name: 'datatable',
  validate: (datatable) => {
    if (!datatable.columns || !datatable.columns.length) throw new Error ('datatable must have at least 1 column');
    if (!datatable.rows) throw new Error ('datatable must have a rows array, even if it is empty');
  },
  from: {
    null: () => {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    },
    pointseries: (context) => {
      return {
        type: 'datatable',
        rows: context.rows,
        columns: map(context.columns, (val, name) => { return { name: name, type: val.type, role: val.role }; }),
      };
    },
  },
  to: {
    render: (datatable) => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          font: undefined,
          paginate: true,
          perPage: 10,
        },
      };
    },
  },
};
