import { AggTypesBucketsBucketAggTypeProvider } from 'ui/agg_types/buckets/_bucket_agg_type';

export function AggTypesBucketsFilterProvider(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);

  return new BucketAggType({
    name: 'filter',
    title: 'Filter',
    params: [
      {
        name: 'geo_bounding_box',
        write: (agg, output) => {
          if (agg.params.geo_bounding_box) {
            output.params.geo_bounding_box = agg.params.geo_bounding_box;
          }
        }
      },

      {
        name: 'range',
        write: (agg, output) => {
          if (agg.params.range) {
            output.params.range = agg.params.range;
          }
        }
      }
    ]
  });
}
