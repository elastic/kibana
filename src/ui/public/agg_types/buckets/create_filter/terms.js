import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';

export function createFilterTerms(aggConfig, key) {
  return buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
}
