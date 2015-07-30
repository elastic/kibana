define(function (require) {
  var buildPhraseFilter = require('ui/filter_manager/lib/phrase');
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildPhraseFilter(aggConfig.params.field, key, aggConfig.vis.indexPattern);
    };
  };
});
