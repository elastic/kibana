import buildPhraseFilter from 'ui/filter_manager/lib/phrase';
define(function (require) {
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
    };
  };
});
