import { map } from 'lodash';

export const datatable = () => ({
  name: 'datatable',
  validate: datatable => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!datatable.columns) {
      throw new Error('datatable must have a columns array, even if it is empty');
    }

    if (!datatable.rows) {
      throw new Error('datatable must have a rows array, even if it is empty');
    }
  },
  from: {
    null: () => {
      return {
        type: 'datatable',
        rows: [],
        columns: [],
      };
    },
    pointseries: context => {
      return {
        type: 'datatable',
        rows: context.rows,
        columns: map(context.columns, (val, name) => {
          return { name: name, type: val.type, role: val.role };
        }),
      };
    },
  },
  to: {
    render: datatable => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          paginate: true,
          perPage: 10,
        },
      };
    },
  },
});
