import Fn from '../fn.js';
import { groupBy, find, zipObject, sortBy } from 'lodash';
import moment from 'moment';

export default new Fn({
  name: 'pointseries',
  type: 'pointseries',
  help: 'Turn a datatable into a point series model',
  context: {
    types: ['datatable'],
  },
  args: {
    // Dimensions
    x: {
      types: ['string'],
      help: 'A string representing the column name.',
    },
    color: {
      types: ['string'],
      help: 'A string representing the column name', // If you need categorization, transform the field.
    },
    // Metrics
    y: {
      types: ['function', 'number'],
      help: 'A static number, or a function (starts with a .) to use to aggregate when there are ' +
      'several points for the same x-axis value',
    },
    size: {
      types: ['function', 'number'], // pointseries(size=.sum(profit))
      help: 'For use in charts that support it, a static number or a function, eg .math() to use for calculating size',
    },
  },
  fn: (context, args) => {
    const columns = {
      _rowId: { type: 'number' }, // This will always be a string since it is effectly the label
      color: { type: 'string' }, // This will always be a string since it is effectly the label
      size: { type: 'number' }, // This will always be a number
      y: { type: 'number' }, // We could probably make this dynamic if we wanted to be able todo vertical & horizontal
      x: { type: find(context.columns, { name: args.x }).type }, // This will determine if the renderer uses ordinal, nominal or temporal scale
    };

    // TODO: break this out into a utility
    function normalizeValue(columnName, value) {
      switch (columns[columnName].type) {
        case 'string':
          return String(value);
        case 'number':
          return Number(value);
        case 'date':
          return moment(value).valueOf();
        default:
          return value;
      }
    }

    // Dimensions. There's probably a better way todo this
    const dimensionNames = ['color', 'x'];
    const result = context.rows.map(row => {
      const newRow = { _rowId: row._rowId };
      dimensionNames.forEach(dimension =>
        newRow[dimension] = args[dimension] ? normalizeValue(dimension, row[args[dimension]]) : '_all');
      return newRow;
    });

    // Measures
    // First group up all of the distinct dimensioned bits. Each of these will be reduced to just 1 value
    // for each measure
    const measureNames = ['y', 'size'];
    const measureDimensions = groupBy(context.rows, (row) => {
      const dimensions = dimensionNames.map(dimension => args[dimension] ? row[args[dimension]] : '_all');
      return dimensions.join('::%BURLAP%::');
    });

    // Then compute that 1 value for each measure
    const rowPromises = [];
    Object.values(measureDimensions).forEach(rows => {
      const subtable = { type: 'datatable', columns: context.columns, rows: rows };
      const measurePromises = measureNames.map(measure =>
        typeof args[measure] === 'function' ? args[measure](subtable) : Promise.resolve(args[measure]));

      rows.forEach(row => {
        rowPromises[row._rowId] = Promise.all(measurePromises).then(measureValues => zipObject(measureNames, measureValues));
      });
    });

    return Promise.all(rowPromises).then(measureRows => {
      result.forEach((row, i) => {
        Object.assign(row, measureRows[i]);
      });

      return {
        type: 'pointseries',
        columns: columns,
        rows: sortBy(result, ['x']),
      };
    });
  },
});
