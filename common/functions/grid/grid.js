import { uniq, map, get, groupBy, keyBy, sortBy, mapValues } from 'lodash';
import Fn from '../fn.js';

const getResultValues = (items, name, sorter) => {
  const vals = uniq(map(items, name).filter(v => v !== undefined));
  return sorter ? sortBy(vals, sorter) : vals.sort();
};

export default new Fn({
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
    mark: {
      types: ['string', 'null'],
      help: 'The icon name to use for marks in the grid',
    },
    palette: {
      types: ['palette', 'null'],
      help: 'A palette object for describing the colors to use in the grid',
      default: '{palette}',
    },
    seriesStyle: {
      multi: true,
      types: ['seriesStyle', 'null'],
      help: 'A style of a specific series',
    },
  },
  fn: (context, args) => {
    // Create a header array. We can determine the header by looking at X and Y. Its possible we won't have either
    // In which case we have a table with a single row and single column and no header right?
    const resultColumns = getResultValues(context.rows, 'x');
    const seriesStyles = keyBy(args.seriesStyle || [], 'label') || {};

    function getConsolidateRow(rows, label) {
      const cells = resultColumns.map((column) => {
        // If there was a y value we could also filter for that. Nice.
        const marks = (!context.columns.x) ? rows : rows.reduce((acc, row) => {
          if (row.x === column) {
            const seriesStyle = seriesStyles[row.color];

            acc.push(Object.assign({}, row, {
              style: {
                color: get(seriesStyle, 'color'),
              },
            }));
          }

          return acc;
        }, []);

        return sortBy(marks, 'text');
      });

      return {
        label,
        cells,
      };
    }

    function getConsolidatedRows(rows) {
      const groupedRows = groupBy(rows, 'y');
      return Object.keys(groupedRows).map(val => getConsolidateRow(groupedRows[val], val));
    }

    // If there is no "y" then there exists only one row. How do we get it?
    // We can also filter the rows by 'y' above.
    const resultRows = (context.columns.y)
      ? getConsolidatedRows(context.rows)
      : [getConsolidateRow(context.rows)];

    const summary = mapValues(context.columns, (val, name) => {
      if (!val) return;
      return Object.assign({}, val, {
        values: getResultValues(context.rows, name, val => val),
      });
    });

    return {
      type: 'render',
      as: 'grid',
      value: {
        mark: args.mark,
        palette: args.palette,
        columns: resultColumns,
        rows: sortBy(resultRows, 'label'),
        summary,
      },
    };
  },
});
