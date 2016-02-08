import buildPhraseFilter from 'ui/filter_manager/lib/phrase';
export default function createTermsFilterProvider(Private) {
  return function (aggConfig, key) {
    return buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
  };
};
