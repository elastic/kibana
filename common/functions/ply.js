// TODO: pointseries performs poorly, that's why we run it on the server.
import { groupBy, flatten, pick, map, find, times } from 'lodash';
import { getType } from '../lib/get_type';


function checkDatatableType(datatable) {
  if (getType(datatable) !== 'datatable') {
    throw new Error ('All ply expressions must return a datatable. Use `as` to turn a literal (eg string, number) into a datatable');
  }
  return datatable;
}

function combineColumns(arrayOfColumnsArrays) {
  return arrayOfColumnsArrays.reduce((resultingColumns, columns) => {
    columns.forEach(column => {
      if(find(resultingColumns, resultingColumn => resultingColumn.name === column.name)) return;
      else resultingColumns.push(column);
    });

    return resultingColumns;
  }, []);
}

// This handles merging the tables produced by multiple expressions run on a single member of the `by` split.
// Thus all tables must be the same length, although their columns do not need to be the same, we will handle combining the columns
function combineAcross(datatableArray) {
  const referenceTable = checkDatatableType(datatableArray[0]);
  const targetRowLength = referenceTable.rows.length;

  // Sanity check
  datatableArray.forEach(datatable => {
    checkDatatableType(datatable);
    if (datatable.rows.length !== targetRowLength) throw new Error ('All expressions must return the same number of rows');
  });

  // Merge columns and rows.
  const arrayOfRowsArrays = map(datatableArray, 'rows');
  const rows = times(targetRowLength, i => {
    const rowsAcross = map(arrayOfRowsArrays, i);
    return Object.assign({}, ...rowsAcross);
  });

  const columns = combineColumns(map(datatableArray, 'columns'));

  return {
    type: 'datatable',
    rows,
    columns,
  };
}

export const ply = {
  name: 'ply',
  type: 'datatable',
  help: 'Subdivide a datatable and pass the resulting tables into an expression, then merge the output',
  context: {
    types: ['datatable'],
  },
  args: {
    by: {
      types: ['string'],
      help: 'The column to subdivide on',
      multi: true,
    },
    expression: {
      types: ['function'],
      multi: true,
      aliases: ['fn', 'function'],
      help: 'An expression to pass each resulting data table into. Tips: \n' +
      ' Expressions must return a datatable. Use `as` to turn literals into datatables.\n' +
      ' Multiple expressions must return the same number of rows.' +
      ' If you need to return a differing row count, pipe into another instance of ply.\n' +
      ' If multiple expressions return the same columns, the last one wins.',
    },
    // In the future it may make sense to add things like shape, or tooltip values, but I think what we have is good for now
    // The way the function below is written you can add as many arbitrary named args as you want.
  },
  fn: (context, args) => {

    const byColumns = args.by.map(by => {
      const column = context.columns.find(column => column.name === by);
      if (!column) throw new Error (`No such column: ${by}`);
      return column;
    });

    // TODO: Need to handle multiple expressions. So much Promise.all
    const keyedDatatables = groupBy(context.rows, row => JSON.stringify(pick(row, args.by)));
    const originalDatatables = Object.values(keyedDatatables).map(rows => ({
      ...context,
      rows,
    }));

    const datatablePromises = originalDatatables.map(originalDatatable => {
      const expressionResultPromises = args.expression.map(expression => expression(originalDatatable));
      return Promise.all(expressionResultPromises).then(combineAcross);
    });

    return Promise.all(datatablePromises).then(newDatatables => {

      // Here we're just merging each for the by splits, so it doesn't actually matter if the rows are the same length
      const columns = combineColumns([byColumns].concat(map(newDatatables, 'columns')));
      const rows  = flatten(newDatatables.map((dt, i) => {
        const byColumnValues = pick(originalDatatables[i].rows[0], args.by);
        return dt.rows.map(row => ({
          ...byColumnValues,
          ...row,
        }));
      }));

      return {
        type: 'datatable',
        rows,
        columns,
      };
    });
  },
};
