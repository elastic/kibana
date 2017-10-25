import { datatable } from '../datatable';

export const pointseries = {
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
