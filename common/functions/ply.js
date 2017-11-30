// TODO: pointseries performs poorly, that's why we run it on the server.
import { groupBy, findIndex, flatten, pick } from 'lodash';
import { getType } from '../lib/get_type';


function checkDatatableType(datatable) {
  if (getType(datatable) !== 'datatable') {
    throw new Error ('All ply expressions must return a datatable. Use `as` to turn a literal (eg string, number) into a datatable');
  }
  return datatable;
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
    const datatablePromises = originalDatatables.map(args.expression);

    return Promise.all(datatablePromises).then(newDatatables => {

      const referenceTable = checkDatatableType(newDatatables[0]);

      const columns = referenceTable.columns.slice(0);
      // Make sure new datatable includes the columns from args.by
      byColumns.forEach(byColumn => {
        if (!columns.find(column => column.name === byColumn.name)) {
          columns.unshift(byColumn);
        }
      });

      const targetRowLength = referenceTable.rows.length;
      const rows  = flatten(newDatatables.map((dt, i) => {
        // False, we don't need this at all, we can get the "by" part of the row by looking at the first row in the original datatable
        //const by = byValues[i]; // We don't have promise.props, so we need to do this by index;
        console.log('YO ROW SUF', originalDatatables[i]);
        const byColumns = pick(originalDatatables[i].rows[0], args.by);

        // Everything has to be a datatable
        if (getType(dt) !== 'datatable') {
          throw new Error ('All ply expressions must return a datatable. Use `as` to turn a literal (eg string, number) into a datatable');
        }

        // Check if each table is consisent, they should all have the same number of rows
        if (dt.rows.length !== targetRowLength) {
          throw new Error ('All datatables returned by ply expressions must have the same number of rows');
        }

        dt.columns.forEach((column) => {
          // if columns has the same name, overwrite. Probably slow.
          const existingColumnIndex = findIndex(columns, newColumn => newColumn.name === column.name);
          if (existingColumnIndex > -1) columns[existingColumnIndex] = column;
          // if column didn't overwrite another, append to newColumns
          else columns.push(column);
        });

        return dt.rows.map(row => ({
          ...byColumns,
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
