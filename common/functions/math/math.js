const Fn = require('../fn.js');
const _ = require('lodash');
const math = require('mathjs');

module.exports = new Fn({
  name: 'math',
  type: 'number',
  help: 'Turn a datatable into a single number using a MathJS formula',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
    },
  },
  fn: (context, args) => {
    // Make the datatable into a mathJS scope
    const columnNames = _.map(context.columns, 'name');

    const columnValues = _.map(columnNames, (name) => _.map(context.rows, name));

    const mathScope = _.zipObject(columnNames, columnValues);

    const result = math.eval(args._, mathScope);

    return result || 0;
  },
});
