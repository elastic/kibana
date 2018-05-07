import { dateRange } from '../../utils/date_range';
import '../../directives/validate_date_math';
import '../../directives/documentation_href';
import { BucketAggType } from './_bucket_agg_type';
import { createFilterDateRange } from './create_filter/date_range';
import { fieldFormats } from '../../registry/field_formats';
import dateRangesTemplate from '../controls/date_ranges.html';

export const dateRangeBucketAgg = new BucketAggType({
  name: 'date_range',
  title: 'Date Range',
  createFilter: createFilterDateRange,
  getKey: function (bucket, key, agg) {
    const formatter = agg.fieldOwnFormatter('text', fieldFormats.getDefaultInstance('date'));
    return dateRange.toString(bucket, formatter);
  },
  getFormat: function () {
    return fieldFormats.getDefaultInstance('string');
  },
  makeLabel: function (aggConfig) {
    return aggConfig.getFieldDisplayName() + ' date ranges';
  },
  params: [{
    name: 'field',
    filterFieldTypes: 'date',
    default: function (agg) {
      return agg.vis.indexPattern.timeFieldName;
    }
  }, {
    name: 'ranges',
    default: [{
      from: 'now-1w/w',
      to: 'now'
    }],
    editor: dateRangesTemplate
  }]
});
