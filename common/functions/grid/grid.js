const Fn = require('../fn.js');
import { uniq, map, sortBy, mapValues } from 'lodash';

module.exports = new Fn({
  name: 'grid',
  aliases: [],
  type: 'render',
  help: 'Produces a single, or a grid, of values',
  context: {
    types: [
      'pointseries',
    ],
  },
  args: {
    palette: {
      types: ['palette', 'null'],
      help: 'A palette object for describing the colors to use in the grid',
      default: {
        type: 'palette',
        colors: ['#01A4A4', '#CC6666', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'],
        gradient: false,
      },
    },
  },
  fn: (context, /*args*/) => {
    // Create a header array. We can determine the header by looking at X and Y. Its possible we won't have either
    // In which case we have a table with a single row and single column and no header right?
    const resultColumns = uniq(map(context.rows, 'x')).sort();

    function getConsolidateRow(rows, label) {
      const cells = resultColumns.map((column) => {
        // If there was a y value we could also filter for that. Nice.

        let marks;
        if (context.columns.x) {
          marks = rows.filter(row => row.x === column);
        } else {
          marks = rows;
        }

        return sortBy(marks, 'text');
      });

      return {
        label,
        cells,
      };
    }

    // If there is no "y" then there exists only one row. How do we get it?
    let resultRows;
    if (context.columns.y) {
      const yValues = uniq(map(context.rows, 'y'));
      resultRows = yValues.map(val => {
        const filteredRows = context.rows.filter(row => row.y === val);
        return getConsolidateRow(filteredRows, val);
      });
    } else {
      resultRows = [
        getConsolidateRow(context.rows), // We can also filter the rows by 'y' above.
      ];
    }

    const summary = mapValues(context.columns, (val, name) => {
      if (!val) return;
      return Object.assign({}, val, {
        values: sortBy(uniq(map(context.rows, name)), val => val),
      });
    });

    return {
      type: 'render',
      as: 'grid',
      value: {
        columns: resultColumns,
        rows: sortBy(resultRows, 'label'),
        summary,
      },
    };
  },
});
