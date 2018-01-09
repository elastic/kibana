import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';

export function AggTypesBucketsCreateFilterTermsProvider() {
  return function (aggConfig, key) {
    const phraseFilter = buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
    if (aggConfig.params.field.type === 'boolean') {
      const matchFilter = phraseFilter.query.match[aggConfig.params.field.name];
      if (matchFilter.query === 0) {
        matchFilter.query = 'false';
      } else {
        matchFilter.query = 'true';
      }
    }
    return phraseFilter;
  };
}
