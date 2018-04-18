import { AggConfig } from '../../vis/agg_config';
import { AggType } from '../../agg_types/agg_type';

export function PointSeriesFakeXAxisProvider() {

  const allAgg = new AggType({
    name: 'all',
    title: 'All docs',
    ordered: false,
    hasNoDsl: true
  });

  return function makeFakeXAxis(vis) {
    const fake = new AggConfig(vis, {
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
}
