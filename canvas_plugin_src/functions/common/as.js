import { getType } from '../../../common/lib/get_type';

export const asFn = () => ({
  name: 'as',
  type: 'datatable',
  context: {
    types: ['string', 'boolean', 'number', 'null'],
  },
  help: 'Creates a datatable with a single value',
  args: {
    _: {
      types: ['string'],
      aliases: ['name'],
      help: 'A name to give the column',
      default: 'value',
    },
  },
  fn: (context, args) => {
    return {
      type: 'datatable',
      columns: [
        {
          name: args._,
          type: getType(context),
        },
      ],
      rows: [
        {
          [args._]: context,
        },
      ],
    };
  },
});
