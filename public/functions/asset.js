import { getState } from '../state/store';
import { getAssetById } from '../state/selectors/assets';

export const asset = {
  name: 'asset',
  aliases: [],
  context: {
    types: ['null'],
  },
  help: 'Use Canvas workpad asset objects to provide argument values. Usually images.',
  args: {
    _: {
      types: ['string'],
      help: 'The ID of the asset value to return',
      multi: false,
    },
  },
  fn: (context, args) => {
    // TODO: handle the case where the asset id provided doesn't exist
    const assetId = args._;
    return getAssetById(getState(), assetId);
  },
};
