/*jshint forin:false*/
// Wrap this all up in a 'kbn' object so I don't have a billion globals
(function() {
  'use strict';

  // Save a reference to this
  var self = this;

  // Save a reference to the old versionof this
  var wasKbn = self.kbn;

  // Create a safe refernce to the kbn object, for use below
  var kbn = this;

  // Create a global object for accessing these functions
  self.kbn = kbn;

  kbn.get_object_fields = function(obj) {
    var field_array = [];
    obj = kbn.flatten_json(obj._source);
    for (var field in obj) {
      field_array.push(field);
    }
    return field_array.sort();
  };

  kbn.get_all_fields = function(data) {
    var fields = [];
    _.each(data,function(hit) {
      fields = _.uniq(fields.concat(_.keys(hit)));
    });
    // Remove stupid angular key
    fields = _.without(fields,'$$hashKey');
    return fields;
  };

  kbn.has_field = function(obj,field) {
    var obj_fields = kbn.get_object_fields(obj);
    if (_.inArray(obj_fields,field) < 0) {
      return false;
    } else {
      return true;
    }
  };

  kbn.get_related_fields = function(docs,field) {
    var field_array = [];
    _.each(docs, function(doc) {
      var keys = _.keys(doc);
      if(_.contains(keys,field)) {
        field_array = field_array.concat(keys);
      }
    });
    var counts = _.countBy(_.without(field_array,field),function(field){return field;});
    return counts;
  };

  kbn.recurse_field_dots = function(object,field) {
    var value = null;
    var nested;
    if (typeof object[field] !== 'undefined') {
      value = object[field];
    }
    else if (nested = field.match(/(.*?)\.(.*)/)) {
      if(typeof object[nested[1]] !== 'undefined') {
        value = (typeof object[nested[1]][nested[2]] !== 'undefined') ?
          object[nested[1]][nested[2]] : kbn.recurse_field_dots(
            object[nested[1]],nested[2]);
      }
    }

    return value;
  };

  kbn.top_field_values = function(docs,field,count) {
    var all_values = _.pluck(docs,field),
      groups = {};

    // manually grouping into pairs allows us to keep the original value,
    _.each(all_values, function (value) {
      var key = _.isUndefined(value) ? '' : value.toString();
      if (_.has(groups, key)) {
        groups[key][1] ++;
      } else {
        groups[key] = [value, 1];
      }
    });

    return _.values(groups).sort(function(a, b) {
      return a[1] - b[1];
    }).reverse().slice(0,count);
  };

   /**
     * Calculate a graph interval
     *
     * from::           Date object containing the start time
     * to::             Date object containing the finish time
     * size::           Calculate to approximately this many bars
     * user_interval::  User specified histogram interval
     *
     */
  kbn.calculate_interval = function(from,to,size,user_interval) {
    if(_.isObject(from)) {
      from = from.valueOf();
    }
    if(_.isObject(to)) {
      to = to.valueOf();
    }
    return user_interval === 0 ? kbn.round_interval((to - from)/size) : user_interval;
  };

  kbn.round_interval = function(interval) {
    switch (true) {
    // 0.5s
    case (interval <= 500):
      return 100;       // 0.1s
    // 5s
    case (interval <= 5000):
      return 1000;      // 1s
    // 7.5s
    case (interval <= 7500):
      return 5000;      // 5s
    // 15s
    case (interval <= 15000):
      return 10000;     // 10s
    // 45s
    case (interval <= 45000):
      return 30000;     // 30s
    // 3m
    case (interval <= 180000):
      return 60000;     // 1m
    // 9m
    case (interval <= 450000):
      return 300000;    // 5m
    // 20m
    case (interval <= 1200000):
      return 600000;    // 10m
    // 45m
    case (interval <= 2700000):
      return 1800000;   // 30m
    // 2h
    case (interval <= 7200000):
      return 3600000;   // 1h
    // 6h
    case (interval <= 21600000):
      return 10800000;  // 3h
    // 24h
    case (interval <= 86400000):
      return 43200000;  // 12h
    // 48h
    case (interval <= 172800000):
      return 86400000;  // 24h
    // 1w
    case (interval <= 604800000):
      return 86400000;  // 24h
    // 3w
    case (interval <= 1814400000):
      return 604800000; // 1w
    // 2y
    case (interval < 3628800000):
      return 2592000000; // 30d
    default:
      return 31536000000; // 1y
    }
  };

  kbn.secondsToHms = function(seconds){
    var numyears = Math.floor(seconds / 31536000);
    if(numyears){
      return numyears + 'y';
    }
    var numdays = Math.floor((seconds % 31536000) / 86400);
    if(numdays){
      return numdays + 'd';
    }
    var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    if(numhours){
      return numhours + 'h';
    }
    var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    if(numminutes){
      return numminutes + 'm';
    }
    var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;
    if(numseconds){
      return numseconds + 's';
    }
    return 'less then a second'; //'just now' //or other string you like;
  };

  kbn.to_percent = function(number,outof) {
    return Math.floor((number/outof)*10000)/100 + "%";
  };

  kbn.addslashes = function(str) {
    str = str.replace(/\\/g, '\\\\');
    str = str.replace(/\'/g, '\\\'');
    str = str.replace(/\"/g, '\\"');
    str = str.replace(/\0/g, '\\0');
    return str;
  };

  // histogram & trends
  kbn.interval_to_seconds = function(string) {
    var matches = string.match(/(\d+(?:\.\d+)?)([Mwdhmsy])/);
    switch (matches[2]) {
    case 'y':
      return matches[1]*31536000;
    case 'M':
      return matches[1]*2592000;
    case 'w':
      return matches[1]*604800;
    case 'd':
      return matches[1]*86400;
    case 'h':
      return matches[1]*3600;
    case 'm':
      return matches[1]*60;
    case 's':
      return matches[1];
    }
  };

  // This should go away, moment.js can do this
  kbn.time_ago = function(string) {
    return new Date(new Date().getTime() - (kbn.interval_to_seconds(string)*1000));
  };

  // LOL. hahahahaha. DIE.
  kbn.flatten_json = function(object,root,array) {
    if (typeof array === 'undefined') {
      array = {};
    }
    if (typeof root === 'undefined') {
      root = '';
    }
    for(var index in object) {
      var obj = object[index];
      var rootname = root.length === 0 ? index : root + '.' + index;
      if(typeof obj === 'object' ) {
        if(_.isArray(obj)) {
          if(obj.length > 0 && typeof obj[0] === 'object') {
            var strval = '';
            for (var objidx = 0, objlen = obj.length; objidx < objlen; objidx++) {
              if (objidx > 0) {
                strval = strval + ', ';
              }

              strval = strval + JSON.stringify(obj[objidx]);
            }
            array[rootname] = strval;
          } else if(obj.length === 1 && _.isNumber(obj[0])) {
            array[rootname] = parseFloat(obj[0]);
          } else {
            array[rootname] = typeof obj === 'undefined' ? null : obj;
          }
        } else {
          kbn.flatten_json(obj,rootname,array);
        }
      } else {
        array[rootname] = typeof obj === 'undefined' ? null : obj;
      }
    }
    return kbn.sortObj(array);
  };

  kbn.xmlEnt = function(value) {
    if(_.isString(value)) {
      var stg1 = value.replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n/g, '<br/>')
        .replace(/\r/g, '<br/>')
        .replace(/\n/g, '<br/>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
        .replace(/  /g, '&nbsp;&nbsp;')
        .replace(/&lt;del&gt;/g, '<del>')
        .replace(/&lt;\/del&gt;/g, '</del>');
      return stg1;
    } else {
      return value;
    }
  };

  kbn.sortObj = function(arr) {
    // Setup Arrays
    var sortedKeys = [];
    var sortedObj = {};
    var i;
    // Separate keys and sort them
    for (i in arr) {
      sortedKeys.push(i);
    }
    sortedKeys.sort();

    // Reconstruct sorted obj based on keys
    for (i in sortedKeys) {
      sortedObj[sortedKeys[i]] = arr[sortedKeys[i]];
    }
    return sortedObj;
  };

  kbn.query_color_dot = function (color, diameter) {
    return '<div class="icon-circle" style="' + [
        'display:inline-block',
        'color:' + color,
        'font-size:' + diameter + 'px',
      ].join(';') + '"></div>';
  };
}).call(this);

/*
  UNDERSCORE.js Mixins
*/
_.mixin({
  move: function (array, fromIndex, toIndex) {
    'use strict';

    array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
    return array;
  },
  remove: function (array, index) {
    'use strict';

    array.splice(index, 1);
    return array;
  },
  toggleInOut: function(array,value) {
    'use strict';
    if(_.contains(array,value)) {
      array = _.without(array,value);
    } else {
      array.push(value);
    }
    return array;
  }
});

/**
 * jQuery plugins
 */
(function () {
  'use strict';

  var $win = $(window);

  $.fn.place_tt = (function () {
    var defaults = {
      offset: 5,
      css: {
        position : 'absolute',
        top : -1000,
        left : 0,
        color : "#c8c8c8",
        padding : '10px',
        'font-size': '11pt',
        'font-weight' : 200,
        'background-color': '#1f1f1f',
        'border-radius': '5px',
      }
    };

    return function (x, y, opts) {
      opts = $.extend(true, {}, defaults, opts);
      return this.each(function () {
        var $tooltip = $(this), width, height;

        $tooltip.css(opts.css);
        if (!$.contains(document.body, $tooltip[0])) {
          $tooltip.appendTo(document.body);
        }

        width = $tooltip.outerWidth(true);
        height = $tooltip.outerHeight(true);

        $tooltip.css('left', x + opts.offset + width > $win.width() ? x - opts.offset - width : x + opts.offset);
        $tooltip.css('top', y + opts.offset + height > $win.height() ? y - opts.offset - height : y + opts.offset);
      });
    };
  })();
}());