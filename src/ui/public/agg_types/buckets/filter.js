import { BucketAggType } from 'ui/agg_types/buckets/_bucket_agg_type';

export const filterBucketAgg = new BucketAggType({
  name: 'filter',
  title: 'Filter',
  params: [
    {
      name: 'geo_bounding_box'
    }
  ]
});
