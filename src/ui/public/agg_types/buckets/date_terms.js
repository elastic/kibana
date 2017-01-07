import _ from 'lodash';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsBucketCountBetweenProvider from 'ui/agg_types/buckets/_bucket_count_between';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';

export default function DateTermsAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  return new BucketAggType({
    name: 'dateterms',
    dslName: 'terms',
    title: 'Date Terms',
    ordered: false,
    getFormat: function () {
      return fieldFormats.getDefaultInstance('string');
    },
    makeLabel: function (agg) {
      return agg.params.field.displayName + ': ' + agg.params.date_term;
    },
    params: [
      {
        name: 'field',
        write: _.noop,
        filterFieldTypes: 'date',
        default: function (agg) {
          return agg.vis.indexPattern.timeFieldName;
        }
      },
      {
        name: 'date_term',
        write: _.noop,
        default: 'day_of_week',
        editor: require('ui/agg_types/controls/date_terms_select.html'),
        controller: function ($scope) {

        }
      },
      {
        name: 'script',
        write: function (agg, output) {
          let dateMethod = 'dayOfWeek';
          switch (agg.params.date_term) {
            case 'month_of_year':
              dateMethod = 'monthOfYear';
              break;
            case 'day_of_week':
              dateMethod = 'dayOfWeek';
              break;
            case 'hour_of_day':
              dateMethod = 'hourOfDay';
              break;
          }
          output.params.script = {
            inline: 'doc[\'' + agg.params.field.name + '\'].date.' + dateMethod,
            lang: 'expression'
          };
        }
      },
      {
        name: 'size',
        write: function (agg, output) {
          let size = 10;
          switch (agg.params.date_term) {
            case 'month_of_year':
              size = 12;
              break;
            case 'day_of_week':
              size = 7;
              break;
            case 'hour_of_day':
              size = 24;
              break;
          }
          output.params.size = size;
        }
      },
      {
        name: 'order',
        write: function (agg, output) {
          output.params.order = {
            '_term': 'asc'
          };
        }
      }
    ]
  });
}
