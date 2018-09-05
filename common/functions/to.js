import { castProvider } from '../interpreter/cast';

export const to = () => ({
  name: 'to',
  aliases: [],
  help: 'Explicitly cast from one type to another.',
  context: {},
  args: {
    type: {
      types: ['string'],
      help: 'A known type',
      aliases: ['_'],
      multi: true,
    },
  },
  fn: (context, args, { types }) => {
    if (!args.type) throw new Error('Must specify a casting type');

    return castProvider(types)(context, args.type);
  },
});
