import { datatable } from './datatable';

export const pointseries = () => ({
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
    number: pointseries => {
      const firstRow = pointseries.rows[0];
      const firstKey = Object.keys(firstRow)[0];
      return firstRow[firstKey];
    },
    render: pointseries => {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable: datatable().from.pointseries(pointseries),
        },
      };
    },
  },
});
