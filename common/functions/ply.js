// TODO: pointseries performs poorly, that's why we run it on the server.
import { groupBy, map, findIndex, flatten } from 'lodash';
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

    const byColumn = context.columns.find(column => column.name === args.by);
    if (!byColumn) throw new Error (`No such column: ${args.by}`);

    // TODO: Need to handle multiple expressions. So much Promise.all
    const keyedDatatables = groupBy(context.rows, args.by);
    const byValues = Object.keys(keyedDatatables);
    const datatablePromises = map(keyedDatatables, rows => args.expression({
      ...context,
      rows,
    }));

    return Promise.all(datatablePromises).then(datatables => {

      const referenceTable = checkDatatableType(datatables[0]);

      // Check if each table is consisent, they should all have the same number of rows
      const columns = referenceTable.columns.slice(0);
      // Make sure new datatable includes the column from args.by
      if (!columns.find(column => column.name === args.by)) {
        columns.unshift(byColumn);
      }

      const targetRowLength = referenceTable.rows.length;
      const rows  = flatten(datatables.map((dt, i) => {
        const by = byValues[i]; // We don't have promise.props, so we need to do this by index;

        if (getType(dt) !== 'datatable') {
          throw new Error ('All ply expressions must return a datatable. Use `as` to turn a literal (eg string, number) into a datatable');
        }

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
          [args.by]: by,
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
