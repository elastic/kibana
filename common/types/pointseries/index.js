import datatable from '../datatable';

export default {
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
        value: {
          datatable: datatable.from(pointseries),
        },
      };
    },
  },
};
