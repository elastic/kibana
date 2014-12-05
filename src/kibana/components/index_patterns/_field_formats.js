/* jshint ignore:start */
/* markdown

### Formatting a value
To format a response value, you need to get ahold of the field list, which is usually available at `indexPattern.fields`. Each field object has a `format` property*, which is an object detailed in [_field_formats.js](https://github.com/elasticsearch/kibana4/blob/master/src/kibana/components/index_patterns/_field_formats.js).

Once you have the field that a response value came from, pass the value to `field.format.convert(value)` and a formatted string representation of the field will be returned.

\* the `format` property on field object's is a non-enumerable getter, meaning that if you itterate/clone/stringify the field object the format property will not be present.

### Changing a field's format

Currently only one field format exists, `"string"`, which just [flattens any value down to a string](https://github.com/elasticsearch/kibana4/blob/master/src/kibana/components/index_patterns/_field_formats.js#L18-L24).

To change the format for a specific field you can either change the default for a field type modify the [default format mapping here](https://github.com/elasticsearch/kibana4/blob/master/src/kibana/components/index_patterns/_field_formats.js#L37-L46).

To change the format for a specific indexPattern's field, add the field and format name to `indexPattern.customFormats` object property.

```js
$scope.onChangeFormat = function (field, format) {
  indexPattern.customFormats[field.name] = format.name;
};
```

### Passing the formats to a chart
Currently, the [histogram formatter](https://github.com/elasticsearch/kibana4/blob/master/src/plugins/visualize/saved_visualizations/resp_converters/histogram.js) passes the formatting function as the `xAxisFormatter` and `yAxisFormatter` function.

*/
/* jshint ignore:end */

define(function (require) {
  return function FieldFormattingService($rootScope, config) {
    var _ = require('lodash');
    var moment = require('moment');

    var formats = [
      {
        types: [
          'number',
          'boolean',
          'date',
          'ip',
          'attachment',
          'geo_point',
          'geo_shape',
          'string',
          'conflict'
        ],
        name: 'string',
        convert: function (val) {
          return formatField(val, function (val) {
            if (_.isObject(val)) {
              return JSON.stringify(val);
            }
            else if (val == null) {
              return '';
            }
            else {
              return '' + val;
            }
          });
        }
      },
      {
        types: [
          'date'
        ],
        name: 'date',
        convert: function (val) {
          return formatField(val, function (val) {
            if (_.isNumber(val) || _.isDate(val)) {
              return moment(val).format(config.get('dateFormat'));
            } else {
              return val;
            }
          });
        }
      },
      {
        types: [
          'ip'
        ],
        name: 'ip',
        convert: function (val) {
          return formatField(val, function (val) {
            if (!isFinite(val)) return val;
            return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
          });
        }
      },
      {
        types: [
          'number'
        ],
        name: 'kilobytes',
        convert: function (val) {
          return formatField(val, function (val) {
            return (val / 1024).toFixed(3) + ' kb';
          });
        }
      }
    ];

    function formatField(value, fn) {
      if (_.isArray(value)) {
        if (value.length === 1) {
          return fn(value[0]);
        } else {
          return JSON.stringify(_.map(value, fn));
        }
      } else {
        return fn(value);
      }
    }

    formats.byType = _.transform(formats, function (byType, formatter) {
      formatter.types.forEach(function (type) {
        var list = byType[type] || (byType[type] = []);
        list.push(formatter);
      });
    }, {});

    formats.byName = _.indexBy(formats, 'name');

    formats.defaultByType = {
      number:     formats.byName.string,
      date:       formats.byName.date,
      boolean:    formats.byName.string,
      ip:         formats.byName.ip,
      attachment: formats.byName.string,
      geo_point:  formats.byName.string,
      geo_shape:  formats.byName.string,
      string:     formats.byName.string,
      conflict:   formats.byName.string
    };

    /**
     * Wrap the dateFormat.convert function in memoize,
     * as moment is a huge performance issue if not memoized.
     *
     * @return {void}
     */
    function memoizeDateFormat() {
      var format = formats.byName.date;
      if (!format._origConvert) {
        format._origConvert = format.convert;
      }
      format.convert = _.memoize(format._origConvert);
    }

    // memoize once config is ready, and every time the date format changes
    $rootScope.$on('init:config', memoizeDateFormat);
    $rootScope.$on('change:config.dateFormat', memoizeDateFormat);

    return formats;
  };
});