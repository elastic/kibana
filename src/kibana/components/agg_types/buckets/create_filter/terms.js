define(function (require) {
  var buildPhraseQuery = require('components/filter_manager/lib/phrase');
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildPhraseQuery(aggConfig.params.field, key);
    };
  };
});
