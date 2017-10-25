export const compare = {
  name: 'compare',
  help: 'Compare the input to something else to determine true or false. Usually used in combination with {if}',
  aliases: ['condition'],
  example: 'math "random()" | compare gt this=0.5',
  type: 'boolean',
  args: {
    _: {
      aliases: ['op'],
      types: ['string'],
      default: 'eq',
      help: 'The operator to use in the comparison: ' +
      ' eq (equal), ne (not equal), lt (less than), gt (greater than), lte (less than equal), gte (greater than eq)',
    },
    to: {
      aliases: ['this', 'b'],
      help: 'A boolean true or false, usually returned by a subexpression',
    },
  },
  fn: (context, args) => {
    const a = context;
    const b = args.to;
    const op = args._;

    switch (op) {
      case 'eq':
        return a === b;
      case 'ne':
        return a !== b;
      case 'lt':
        return a < b;
      case 'lte':
        return a <= b;
      case 'gt':
        return a > b;
      case 'gte':
        return a >= b;
    }
  },
};
