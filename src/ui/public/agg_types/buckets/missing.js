import { AggTypesBucketsBucketAggTypeProvider } from 'ui/agg_types/buckets/_bucket_agg_type';

export function AggTypesBucketsMissingProvider(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);

  return new BucketAggType({
    name: 'missing',
    title: 'Missing',
    params: [
      {
        name: 'field'
      }
    ]
  });
}
