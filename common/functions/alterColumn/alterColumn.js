import _ from 'lodash';

export default {
  name: 'alterColumn',
  type: 'datatable',
  help: 'Converts between core types, eg string, number, null, boolean, date',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
    },
    type: {
      types: ['string'],
    },
    name: {
      types: ['string'],
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

    let handler = _.noop;
    if (args.type) {
      handler = (function getHandler() {
        switch (type) {
          case 'string': return String;
          case 'number': return Number;
          case 'date': return (v) => (new Date(v)).valueOf();
          case 'boolean': return Boolean;
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
