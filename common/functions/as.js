import { getType } from '../lib/get_type';

export const asFn = {
  name: 'as',
  type: 'datatable',
  context: {
    types: ['string', 'boolean', 'number', 'null'],
  },
  help: 'Perform conditional logic',
  args: {
    _: {
      types: ['string'],
      'aliases': ['name'],
      help: 'A the name to give the column',
    },
  },
  fn: (context, args) => {
    return {
      type: 'datatable',
      columns: [{
        name: args._,
        type: getType(context),
      }],
      rows: [{
        [args._]: context,
      }],
    };
  },
};
