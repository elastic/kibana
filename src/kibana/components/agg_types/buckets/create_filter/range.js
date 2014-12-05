define(function (require) {
  return function createRangeFilterPrivider(Private) {
    return function (aggConfig, key) {
      var filter = { meta: {}, range: {} };
      var splits = key.split(/\-/);
      var gte = Number(splits[0]);
      var lte = Number(splits[1]);
      filter.range[aggConfig.params.field.name] = {
        gte: gte,
        lte: lte
      };
      filter.meta.index = aggConfig.vis.indexPattern.id;
      return filter;
    };
  };
});
