const Fn = require('../fn.js');
const _ = require('lodash');
const moment = require('moment');

module.exports = new Fn({
  name: 'pointseries',
  type: 'cartesian',
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
    const dimensionNames = ['color', 'x'];
    const measureNames = ['y', 'size'];
    const columns = {
      _rowId: { type: 'number' }, // This will always be a string since it is effectly the label
      color: { type: 'string' }, // This will always be a string since it is effectly the label
      size: { type: 'number' }, // This will always be a number
      y: { type: 'number' }, // We could probably make this dynamic if we wanted to be able todo vertical & horizontal
      x: { type: _.find(context.columns, { name: args.x }).type }, // This will determine if the renderer uses ordinal, nominal or temporal scale
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
    const result = _.map(context.rows, row => {
      const newRow = { _rowId: row._rowId };
      _.each(dimensionNames, dimension =>
        newRow[dimension] = args[dimension] ? normalizeValue(dimension, row[args[dimension]]) : '_all');
      return newRow;
    });

    // Measures

    // First group up all of the distinct dimensioned bits. Each of these will be reduced to just 1 value
    // for each measure
    const measureDimensions = _.groupBy(context.rows, (row) => {
      const dimensions = _.map(dimensionNames, dimension => args[dimension] ? row[args[dimension]] : '_all');
      return dimensions.join('::%BURLAP%::');
    });

    // Then compute that 1 value for each measure
    const rowPromises = [];
    _.each(measureDimensions, rows => {
      const subtable = { type: 'datatable', columns: context.columns, rows: rows };
      const measurePromises = _.map(measureNames, measure =>
        typeof args[measure] === 'function' ? args[measure](subtable) : Promise.resolve(args[measure]));

      _.each(rows, row => {
        rowPromises[row._rowId] = Promise.all(measurePromises).then(measureValues => _.zipObject(measureNames, measureValues));
      });
    });

    return Promise.all(rowPromises).then(measureRows => {
      _.each(result, (row, i) => {
        _.assign(row, measureRows[i]);
      });

      return {
        type: 'cartesian',
        columns: columns,
        rows: result,
      };
    });
  },
});
