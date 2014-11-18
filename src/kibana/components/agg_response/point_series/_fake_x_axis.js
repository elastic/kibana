define(function (require) {
  return function PointSeriesFakeXAxis(Private) {
    var AggConfig = Private(require('components/vis/_agg_config'));
    var AggType = Private(require('components/agg_types/_agg_type'));

    var allAgg = new AggType({
      name: 'all',
      title: 'All docs',
      ordered: false,
      hasNoDsl: true
    });

    function makeFakeXAxis(vis, col, agg, index) {
      var fake = new AggConfig(vis, {
        type: allAgg,
        schema: vis.type.schemas.all.byName.segment
      });

      index.x = -1;
      agg.x = fake;
      col.x = {
        aggConfig: fake,
        label: fake.makeLabel()
      };
    }

    return makeFakeXAxis;
  };
});