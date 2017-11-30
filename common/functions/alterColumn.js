import _ from 'lodash';

export const alterColumn = {
  name: 'alterColumn',
  type: 'datatable',
  help: 'Converts between core types, eg string, number, null, boolean, date and rename columns',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
      help: 'The name of the column to alter',
    },
    type: {
      types: ['string'],
      help: 'The type to convert the column to. Leave blank to not change type.',
      default: null,
    },
    name: {
      types: ['string'],
      help: 'The resultant column name. Leave blank to not rename.',
      default: null,
    },
  },
  fn: (context, args) => {
    const column = _.find(context.columns, { name: args.column });
    if (!column) throw new Error(`Column not found: '${args.column}'`);

    let destination = args.column;
    if (args.name) {
      destination = args.name;
    }

    const type = args.type || column.type;

    let handler = val => val;
    if (args.type) {
      handler = (function getHandler() {
        switch (type) {
          case 'string': return String;
          case 'number': return Number;
          case 'date': return (v) => (new Date(v)).valueOf();
          case 'boolean': return Boolean;
          case 'null': return null;
          default: throw new Error(`can not convert to ${type}`);
        }
      }());
    }

    column.name = destination;
    column.type = type;

    context.rows = _.map(context.rows, row =>
      Object.assign(_.omit(row, args.column), { [destination]: handler(row[args.column]) })
    );

    return context;
  },
};
