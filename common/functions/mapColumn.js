import { getType } from '../lib/get_type';

export const mapColumn = () => ({
  name: 'mapColumn',
  aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
  type: 'datatable',
  help: 'Add a column calculated as the result of other columns, or not',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['column'],
      help: 'The name of the resulting column',
    },
    expression: {
      types: ['function'],
      aliases: ['exp', 'fn'],
      help: 'A canvas expression which will be passed each row as a single row datatable',
    },
  },
  fn: (context, args) => {
    if (!args._) throw new Error('Must provide a column name');

    args.expression = args.expression || (() => Promise.resolve(null));

    const columns = [...context.columns];
    const rowPromises = context.rows.map(row => {
      return args
        .expression({
          type: 'datatable',
          columns,
          rows: [row],
        })
        .then(val => {
          if (typeof val === 'object' && val !== null) {
            throw new Error('Expression must return a literal, eg a string, number, boolean, null');
          }

          return {
            ...row,
            [args._]: val,
          };
        });
    });

    return Promise.all(rowPromises).then(rows => {
      const existingColumnIndex = columns.findIndex(({ name }) => name === args._);
      const type = getType(rows[0][args._]);
      const newColumn = { name: args._, type };
      if (existingColumnIndex === -1) {
        columns.push(newColumn);
      } else {
        columns[existingColumnIndex] = newColumn;
      }

      return {
        type: 'datatable',
        columns,
        rows,
      };
    });
  },
});
