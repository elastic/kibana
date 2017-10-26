import { getState } from '../../state/store';
import { getAssetById } from '../../state/selectors/assets';

export const asset = {
  name: 'asset',
  aliases: [],
  help: 'Use Canvas workpad asset objects to provide argument values',
  args: {
    _: {
      types: ['string'],
      multi: false,
    },
  },
  fn: (config, args) => {
    // TODO: handle the case where the asset id provided doesn't exist
    const assetId = args._;
    return getAssetById(getState(), assetId);
  },
};
