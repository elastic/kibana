/*
  WARNING: This is imported into the public and server function registries separately because
  it needs access to types and the registry of types is, obviously, different between the environments
*/

import Fn from '../fn';
import { castProvider } from '../../interpreter/cast';

export function toProvider(types) {
  return new Fn({
    name: 'to',
    aliases: [],
    help: 'Explicitly cast from one type to another.',
    context: {},
    args: {
      _: {
        types: ['string'],
        help: 'A known type',
        aliases: ['type'],
        multi: true,
      },
    },
    fn: (context, args) => {
      if (!args._) throw new Error ('Must specify a casting type');
      return castProvider(types.toJS())(context, args._);
    },
  });
}
