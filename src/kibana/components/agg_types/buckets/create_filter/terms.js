define(function (require) {
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      var filter = { query: { match: {} } };
      filter.query.match[aggConfig.params.field.name] = {
        query: key,
        type: 'phrase'
      };
      filter.$$indexPattern = aggConfig.vis.indexPattern.id;
      return filter;
    };
  };
});
