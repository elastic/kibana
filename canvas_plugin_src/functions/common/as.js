import { getType } from '../../../common/lib/get_type';

export const asFn = () => ({
  name: 'as',
  type: 'datatable',
  context: {
    types: ['string', 'boolean', 'number', 'null'],
  },
  help: 'Creates a datatable with a single value',
  args: {
    name: {
      types: ['string'],
      aliases: ['_'],
      help: 'A name to give the column',
      default: 'value',
    },
  },
  fn: (context, args) => {
    return {
      type: 'datatable',
      columns: [
        {
          name: args.name,
          type: getType(context),
        },
      ],
      rows: [
        {
          [args.name]: context,
        },
      ],
    };
  },
});
