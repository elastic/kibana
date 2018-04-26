import { BucketAggType } from './_bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import orderAndSizeTemplate from '../controls/order_and_size.html';

export const significantTermsBucketAgg = new BucketAggType({
  name: 'significant_terms',
  title: 'Significant Terms',
  makeLabel: function (aggConfig) {
    return 'Top ' + aggConfig.params.size + ' unusual terms in ' + aggConfig.getFieldDisplayName();
  },
  createFilter: createFilterTerms,
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
