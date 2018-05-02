import { AggTypesBucketsBucketAggTypeProvider } from './_bucket_agg_type';

export function AggTypesBucketsFilterProvider(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);

  return new BucketAggType({
    name: 'filter',
    title: 'Filter',
    params: [
      {
        name: 'geo_bounding_box'
      }
    ]
  });
}
