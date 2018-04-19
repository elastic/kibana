import { AggTypesBucketsBucketAggTypeProvider } from './_bucket_agg_type';
import { AggTypesBucketsCreateFilterTermsProvider } from './create_filter/terms';
import orderAndSizeTemplate from '../controls/order_and_size.html';

export function AggTypesBucketsSignificantTermsProvider(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterTermsProvider);

  return new BucketAggType({
    name: 'significant_terms',
    title: 'Significant Terms',
    makeLabel: function (aggConfig) {
      return 'Top ' + aggConfig.params.size + ' unusual terms in ' + aggConfig.getFieldDisplayName();
    },
    createFilter: createFilter,
    params: [
      {
        name: 'field',
        scriptable: false,
        filterFieldTypes: 'string'
      },
      {
        name: 'size',
        editor: orderAndSizeTemplate,
      },
      {
        name: 'exclude',
        type: 'regex',
        advanced: true
      },
      {
        name: 'include',
        type: 'regex',
        advanced: true
      }
    ]
  });
}
