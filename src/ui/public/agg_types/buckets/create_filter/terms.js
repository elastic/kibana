import { buildPhraseFilter } from '../../../filter_manager/lib/phrase';

export function AggTypesBucketsCreateFilterTermsProvider() {
  return function (aggConfig, key) {
    return buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
  };
}
