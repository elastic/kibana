import { BucketAggType } from './_bucket_agg_type';

export const filterBucketAgg = new BucketAggType({
  name: 'filter',
  title: 'Filter',
  params: [
    {
      name: 'geo_bounding_box'
    }
  ]
});
