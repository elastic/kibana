define(function (require) {
  return function PointSeriesFakeXAxis(Private) {
    let AggConfig = Private(require('ui/Vis/AggConfig'));
    let AggType = Private(require('ui/agg_types/AggType'));

    let allAgg = new AggType({
      name: 'all',
      title: 'All docs',
      ordered: false,
      hasNoDsl: true
    });

    return function makeFakeXAxis(vis) {
      let fake = new AggConfig(vis, {
        type: allAgg,
        schema: vis.type.schemas.all.byName.segment
      });

      return {
        i: -1,
        agg: fake,
        col: {
          aggConfig: fake,
          label: fake.makeLabel()
        }
      };
    };
  };
});
