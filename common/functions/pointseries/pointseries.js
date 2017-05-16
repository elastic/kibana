import Fn from '../fn.js';
import moment from 'moment';
import { groupBy, zipObject, uniqBy, omit, pickBy, find } from 'lodash';

module.exports = new Fn({
  name: 'pointseries',
  type: 'pointseries',
  help: 'Turn a datatable into a point series model. Dimensions are combined to create unique keys. Measures are then ' +
  'deduplicated by those keys.',
  context: {
    types: ['datatable'],
  },
  args: {
    // Dimensions
    x: {
      types: ['string', 'function', 'null'],
      help: 'A mathmatic expression that returns the values for a dimension or measure',
    },
    color: {
      types: ['string', 'function', 'null'],
      help: 'A string representing the column name or a function that returns a number', // If you need categorization, transform the field.
    },
    // Metrics
    y: {
      types: ['string', 'function', 'null'],
      help: 'A static number, or a function (starts with a .) to use to aggregate when there are ' +
      'several points for the same x-axis value',
    },
    // Size only makes sense as a number
    size: {
      types: ['string', 'function', 'null'], // pointseries(size=.sum(profit))
      help: 'For use in charts that support it, a function that returns a number, eg .math() to use for calculating size',
    },
    // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
  },
  fn: (context, args) => {
    function getType(arg) {
      return typeof arg === 'string' ? find(context.columns, { name: arg }).type : 'number';
    }

    const columns = {
      // It seems reasonable that all dimensions would be strings and all measures would be numbers, right?
      color: { type: getType(args.color) }, // This will always be a string since it is effectly the label
      size: { type: getType(args.size) }, // This will always be a number
      y: { type: getType(args.y) }, // We could probably make this dynamic if we wanted to be able todo vertical & horizontal
      x: { type: getType(args.x) }, // This will determine if the renderer uses ordinal, nominal or temporal scale
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
    const dimensionNames = Object.keys(pickBy(args, val => typeof val === 'string'));
    const result = context.rows.map(row => {
      const newRow = { _rowId: row._rowId };
      dimensionNames.forEach(dimension =>
        newRow[dimension] = args[dimension] ? normalizeValue(dimension, row[args[dimension]]) : '_all');
      return newRow;
    });

    // Measures
    // First group up all of the distinct dimensioned bits. Each of these will be reduced to just 1 value
    // for each measure
    const measureNames = Object.keys(pickBy(args, val => typeof val === 'function'));
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

      const rows = uniqBy(result, row => JSON.stringify(omit(row, '_rowId')));
      console.log(rows.length);

      return {
        type: 'pointseries',
        columns: columns,
        //rows: sortBy(result, ['x']),
        // It only makes sense to uniq the rows in a point series as 2 values can not exist in the exact same place at the same time.
        rows: rows,
      };
    });
  },
});
