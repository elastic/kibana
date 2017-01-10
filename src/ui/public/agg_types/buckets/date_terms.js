import _ from 'lodash';
import moment from 'moment';
import mondayFirstWeekdays from 'ui/utils/monday_first_weekdays';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import CreateFilterProvider from 'ui/agg_types/buckets/create_filter/date_terms';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';

export default function DateTermsAggDefinition(Private) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const createFilter = Private(CreateFilterProvider);
  const weekdays = mondayFirstWeekdays();

  return new BucketAggType({
    name: 'dateterms',
    dslName: 'terms',
    title: 'Date Terms',
    ordered: false,
    getKey: function (bucket, key, agg) {
      let prettyKey = key;
      switch (agg.params.date_method) {
        case 'monthOfYear':
          const monthIndex = key - 1;
          prettyKey = moment.monthsShort()[monthIndex];
          break;
        case 'dayOfWeek':
          const dayIndex = key - 1;
          prettyKey = weekdays[dayIndex];
          break;
      }
      return prettyKey;
    },
    getFormat: function () {
      return fieldFormats.getDefaultInstance('string');
    },
    makeLabel: function (agg) {
      return agg.params.field.displayName + ': ' + agg.params.date_method;
    },
    createFilter: createFilter,
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
        name: 'date_method',
        write: _.noop,
        default: 'dayOfWeek',
        editor: require('ui/agg_types/controls/date_terms_select.html'),
        controller: function ($scope) {

        }
      },
      {
        name: 'script',
        write: function (agg, output) {
          output.params.script = {
            inline: 'doc[\'' + agg.params.field.name + '\'].date.' + agg.params.date_method,
            lang: 'expression'
          };
        }
      },
      {
        name: 'size',
        write: function (agg, output) {
          let size = 10;
          switch (agg.params.date_method) {
            case 'monthOfYear':
              size = 12;
              break;
            case 'dayOfWeek':
              size = 7;
              break;
            case 'hourOfDay':
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
      },
      {
        name: 'valueType',
        write: function (agg, output) {
          output.params.valueType = 'float';
        }
      }
    ]
  });
}
