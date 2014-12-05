define(function (require) {
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      var filter = { meta: {}, query: { match: {} } };
      filter.query.match[aggConfig.params.field.name] = {
        query: key,
        type: 'phrase'
      };
      filter.meta.index = aggConfig.vis.indexPattern.id;
      return filter;
    };
  };
});
