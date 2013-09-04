/*jshint globalstrict:true */
/*global angular:true */

/*

  ## Histogram

  ### Parameters
  * auto_int :: Auto calculate data point interval?
  * resolution ::  If auto_int is enables, shoot for this many data points, rounding to
                    sane intervals
  * interval :: Datapoint interval in elasticsearch date math format (eg 1d, 1w, 1y, 5y)
  * fill :: Only applies to line charts. Level of area shading from 0-10
  * linewidth ::  Only applies to line charts. How thick the line should be in pixels
                  While the editor only exposes 0-10, this can be any numeric value.
                  Set to 0 and you'll get something like a scatter plot
  * timezone :: This isn't totally functional yet. Currently only supports browser and utc.
                browser will adjust the x-axis labels to match the timezone of the user's
                browser
  * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query
  * zoomlinks :: Show the zoom links?
  * bars :: Show bars in the chart
  * stack :: Stack multiple queries. This generally a crappy way to represent things.
             You probably should just use a line chart without stacking
  * points :: Should circles at the data points on the chart
  * lines :: Line chart? Sweet.
  * legend :: Show the legend?
  * x-axis :: Show x-axis labels and grid lines
  * y-axis :: Show y-axis labels and grid lines
  * interactive :: Allow drag to select time range

*/

'use strict';

angular.module('kibana.histogram', [])
.controller('histogram', function($scope, querySrv, dashboard, filterSrv, timeSeries) {

  $scope.panelMeta = {
    editorTabs : [
      {title:'Queries', src:'partials/querySelect.html'}
    ],
    status  : "Stable",
    description : "A bucketed time series chart of the current query or queries. Uses the "+
      "Elasticsearch date_histogram facet. If using time stamped indices this panel will query"+
      " them sequentially to attempt to apply the lighest possible load to your Elasticsearch cluster"
  };

  // Set and populate defaults
  var _d = {
    mode        : 'count',
    time_field  : '@timestamp',
    queries     : {
      mode        : 'all',
      ids         : []
    },
    value_field : null,
    auto_int    : true,
    resolution  : 100,
    interval    : '5m',
    fill        : 0,
    linewidth   : 3,
    timezone    : 'browser', // browser, utc or a standard timezone
    spyable     : true,
    zoomlinks   : true,
    bars        : true,
    stack       : true,
    points      : false,
    lines       : false,
    legend      : true,
    'x-axis'    : true,
    'y-axis'    : true,
    percentage  : false,
    interactive : true,
    tooltip     : {
      value_type: 'cumulative',
      query_as_alias: false
    }
  };

  _.defaults($scope.panel,_d);

  $scope.init = function() {
    $scope.$on('refresh',function(){
      $scope.get_data();
    });

    $scope.get_data();

  };

  /**
   * The time range effecting the panel
   * @return {[type]} [description]
   */
  $scope.get_time_range = function () {
    var range = $scope.range = filterSrv.timeRange('min');
    return range;
  };

  $scope.get_interval = function () {
    var interval = $scope.panel.interval,
                    range;
    if ($scope.panel.auto_int) {
      range = $scope.get_time_range();
      if (range) {
        interval = kbn.secondsToHms(
          kbn.calculate_interval(range.from, range.to, $scope.panel.resolution, 0) / 1000
        );
      }
    }
    $scope.panel.interval = interval || '10m';
    return $scope.panel.interval;
  };

  /**
   * Fetch the data for a chunk of a queries results. Multiple segments occur when several indicies
   * need to be consulted (like timestamped logstash indicies)
   *
   * The results of this function are stored on the scope's data property. This property will be an
   * array of objects with the properties info, time_series, and hits. These objects are used in the
   * render_panel function to create the historgram.
   *
   * @param {number} segment   The segment count, (0 based)
   * @param {number} query_id  The id of the query, generated on the first run and passed back when
   *                            this call is made recursively for more segments
   */
  $scope.get_data = function(segment, query_id) {
    if (_.isUndefined(segment)) {
      segment = 0;
    }
    delete $scope.panel.error;

    // Make sure we have everything for the request to complete
    if(dashboard.indices.length === 0) {
      return;
    }
    var _range = $scope.get_time_range();
    var _interval = $scope.get_interval(_range);

    if ($scope.panel.auto_int) {
      $scope.panel.interval = kbn.secondsToHms(
        kbn.calculate_interval(_range.from,_range.to,$scope.panel.resolution,0)/1000);
    }

    $scope.panelMeta.loading = true;
    var request = $scope.ejs.Request().indices(dashboard.indices[segment]);

    $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
    // Build the query
    _.each($scope.panel.queries.ids, function(id) {
      var query = $scope.ejs.FilteredQuery(
        querySrv.getEjsObj(id),
        filterSrv.getBoolFilter(filterSrv.ids)
      );

      var facet = $scope.ejs.DateHistogramFacet(id);

      if($scope.panel.mode === 'count') {
        facet = facet.field($scope.panel.time_field);
      } else {
        if(_.isNull($scope.panel.value_field)) {
          $scope.panel.error = "In " + $scope.panel.mode + " mode a field must be specified";
          return;
        }
        facet = facet.keyField($scope.panel.time_field).valueField($scope.panel.value_field);
      }
      facet = facet.interval(_interval).facetFilter($scope.ejs.QueryFilter(query));
      request = request.facet(facet).size(0);
    });

    // Populate the inspector panel
    $scope.populate_modal(request);

    // Then run it
    var results = request.doSearch();


    // Populate scope when we have results
    results.then(function(results) {
      $scope.panelMeta.loading = false;
      if(segment === 0) {
        $scope.hits = 0;
        $scope.data = [];
        query_id = $scope.query_id = new Date().getTime();
      }

      // Check for error and abort if found
      if(!(_.isUndefined(results.error))) {
        $scope.panel.error = $scope.parse_error(results.error);
        return;
      }

      // Convert facet ids to numbers
      var facetIds = _.map(_.keys(results.facets),function(k){return parseInt(k, 10);});

      // Make sure we're still on the same query/queries
      if($scope.query_id === query_id && _.difference(facetIds, $scope.panel.queries.ids).length === 0) {

        var i = 0,
          time_series,
          hits;

        _.each($scope.panel.queries.ids, function(id) {
          var query_results = results.facets[id];
          // we need to initialize the data variable on the first run,
          // and when we are working on the first segment of the data.
          if(_.isUndefined($scope.data[i]) || segment === 0) {
            time_series = new timeSeries.ZeroFilled({
              interval: _interval,
              start_date: _range && _range.from,
              end_date: _range && _range.to,
              fill_style: 'minimal'
            });
            hits = 0;
          } else {
            time_series = $scope.data[i].time_series;
            hits = $scope.data[i].hits;
          }

          // push each entry into the time series, while incrementing counters
          _.each(query_results.entries, function(entry) {
            time_series.addValue(entry.time, entry[$scope.panel.mode]);
            hits += entry.count; // The series level hits counter
            $scope.hits += entry.count; // Entire dataset level hits counter
          });
          $scope.data[i] = {
            info: querySrv.list[id],
            time_series: time_series,
            hits: hits
          };

          i++;
        });

        // Tell the histogram directive to render.
        $scope.$emit('render');

        // If we still have segments left, get them
        if(segment < dashboard.indices.length-1) {
          $scope.get_data(segment+1,query_id);
        }
      }
    });
  };

  // function $scope.zoom
  // factor :: Zoom factor, so 0.5 = cuts timespan in half, 2 doubles timespan
  $scope.zoom = function(factor) {
    var _now = Date.now();
    var _range = filterSrv.timeRange('min');
    var _timespan = (_range.to.valueOf() - _range.from.valueOf());
    var _center = _range.to.valueOf() - _timespan/2;

    var _to = (_center + (_timespan*factor)/2);
    var _from = (_center - (_timespan*factor)/2);

    // If we're not already looking into the future, don't.
    if(_to > Date.now() && _range.to < Date.now()) {
      var _offset = _to - Date.now();
      _from = _from - _offset;
      _to = Date.now();
    }

    if(factor > 1) {
      filterSrv.removeByType('time');
    }
    filterSrv.set({
      type:'time',
      from:moment.utc(_from),
      to:moment.utc(_to),
      field:$scope.panel.time_field
    });

    dashboard.refresh();

  };

  // I really don't like this function, too much dom manip. Break out into directive?
  $scope.populate_modal = function(request) {
    $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
  };

  $scope.set_refresh = function (state) {
    $scope.refresh = state;
  };

  $scope.close_edit = function() {
    if($scope.refresh) {
      $scope.get_data();
    }
    $scope.refresh =  false;
    $scope.$emit('render');
  };

})
.directive('histogramChart', function(dashboard, filterSrv, $rootScope) {
  return {
    restrict: 'A',
    template: '<div></div>',
    link: function(scope, elem, attrs, ctrl) {

      // Receive render events
      scope.$on('render',function(){
        render_panel();
      });

      // Re-render if the window is resized
      angular.element(window).bind('resize', function(){
        render_panel();
      });

      // Function for rendering panel
      function render_panel() {

        // IE doesn't work without this
        elem.css({height:scope.panel.height||scope.row.height});

        // Populate from the query service
        try {
          _.each(scope.data, function(series) {
            series.label = series.info.alias;
            series.color = series.info.color;
          });
        } catch(e) {return;}

        // Set barwidth based on specified interval
        var barwidth = kbn.interval_to_seconds(scope.panel.interval)*1000;

        var scripts = $LAB.script("common/lib/panels/jquery.flot.js").wait()
          .script("common/lib/panels/jquery.flot.time.js")
          .script("common/lib/panels/jquery.flot.stack.js")
          .script("common/lib/panels/jquery.flot.selection.js")
          .script("common/lib/panels/timezone.js");

        // Populate element. Note that jvectormap appends, does not replace.
        scripts.wait(function(){
          var stack = scope.panel.stack ? true : null;

          // Populate element
          try {
            var options = {
              legend: { show: false },
              series: {
                //stackpercent: scope.panel.stack ? scope.panel.percentage : false,
                stack: scope.panel.percentage ? null : stack,
                lines:  {
                  show: scope.panel.lines,
                  fill: scope.panel.fill/10,
                  lineWidth: scope.panel.linewidth,
                  steps: false
                },
                bars:   {
                  show: scope.panel.bars,
                  fill: 1,
                  barWidth: barwidth/1.8,
                  zero: false,
                  lineWidth: 0
                },
                points: {
                  show: scope.panel.points,
                  fill: 1,
                  fillColor: false,
                  radius: 5
                },
                shadowSize: 1
              },
              yaxis: {
                show: scope.panel['y-axis'],
                min: 0,
                max: scope.panel.percentage && scope.panel.stack ? 100 : null,
              },
              xaxis: {
                timezone: scope.panel.timezone,
                show: scope.panel['x-axis'],
                mode: "time",
                min: _.isUndefined(scope.range.from) ? null : scope.range.from.getTime(),
                max: _.isUndefined(scope.range.to) ? null : scope.range.to.getTime(),
                timeformat: time_format(scope.panel.interval),
                label: "Datetime",
              },
              grid: {
                backgroundColor: null,
                borderWidth: 0,
                hoverable: true,
                color: '#c8c8c8'
              }
            };

            if(scope.panel.interactive) {
              options.selection = { mode: "x", color: '#666' };
            }

            // when rendering stacked bars, we need to ensure each point that has data is zero-filled
            // so that the stacking happens in the proper order
            var required_times = [];
            if (scope.data.length > 1) {
              required_times = _.uniq(Array.prototype.concat.apply([], _.map(scope.data, function (query) {
                return query.time_series.getOrderedTimes();
              })).sort(), true);
            }

            for (var i = 0; i < scope.data.length; i++) {
              scope.data[i].data = scope.data[i].time_series.getFlotPairs(required_times);
            }

            scope.plot = $.plot(elem, scope.data, options);

          } catch(e) {
            elem.text(e);
          }
        });
      }

      function time_format(interval) {
        var _int = kbn.interval_to_seconds(interval);
        if(_int >= 2628000) {
          return "%m/%y";
        }
        if(_int >= 86400) {
          return "%m/%d/%y";
        }
        if(_int >= 60) {
          return "%H:%M<br>%m/%d";
        }

        return "%H:%M:%S";
      }

      var $tooltip = $('<div>');
      elem.bind("plothover", function (event, pos, item) {
        var group, value;
        if (item) {
          if (item.series.info.alias || scope.panel.tooltip.query_as_alias) {
            group = '<small style="font-size:0.9em;">' +
              '<i class="icon-circle" style="color:'+item.series.color+';"></i>' + ' ' +
              (item.series.info.alias || item.series.info.query)+
            '</small><br>';
          } else {
            group = kbn.query_color_dot(item.series.color, 15) + ' ';
          }
          if (scope.panel.stack && scope.panel.tooltip.value_type === 'individual')  {
            value = item.datapoint[1] - item.datapoint[2];
          } else {
            value = item.datapoint[1];
          }
          $tooltip
            .html(
              group + value + " @ " + moment(item.datapoint[0]).format('MM/DD HH:mm:ss')
            )
            .place_tt(pos.pageX, pos.pageY);
        } else {
          $tooltip.detach();
        }
      });

      elem.bind("plotselected", function (event, ranges) {
        var _id = filterSrv.set({
          type  : 'time',
          from  : moment.utc(ranges.xaxis.from),
          to    : moment.utc(ranges.xaxis.to),
          field : scope.panel.time_field
        });
        dashboard.refresh();
      });
    }
  };
})
.service('timeSeries', function () {
  // map compatable parseInt
  function base10Int(val) {
    return parseInt(val, 10);
  }

  function getDatesTime(date) {
    return Math.floor(date.getTime() / 1000)*1000;
  }

  /**
   * Certain graphs require 0 entries to be specified for them to render
   * properly (like the line graph). So with this we will caluclate all of
   * the expected time measurements, and fill the missing ones in with 0
   * @param {object} opts  An object specifying some/all of the options
   *
   * OPTIONS:
   * @opt   {string}   interval    The interval notion describing the expected spacing between
   *                                each data point.
   * @opt   {date}     start_date  (optional) The start point for the time series, setting this and the
   *                                end_date will ensure that the series streches to resemble the entire
   *                                expected result
   * @opt   {date}     end_date    (optional) The end point for the time series, see start_date
   * @opt   {string}   fill_style  Either "minimal", or "all" describing the strategy used to zero-fill
   *                                the series.
   */
  this.ZeroFilled = function (opts) {
    opts = _.defaults(opts, {
      interval: '10m',
      start_date: null,
      end_date: null,
      fill_style: 'minimal'
    });

    // the expected differenece between readings.
    this.interval_ms = base10Int(kbn.interval_to_seconds(opts.interval)) * 1000;

    // will keep all values here, keyed by their time
    this._data = {};
    this.start_time = opts.start_date && getDatesTime(opts.start_date);
    this.end_time = opts.end_date && getDatesTime(opts.end_date);
    this.opts = opts;
  };

  /**
   * Add a row
   * @param {int}  time  The time for the value, in
   * @param {any}  value The value at this time
   */
  this.ZeroFilled.prototype.addValue = function (time, value) {
    if (time instanceof Date) {
      time = getDatesTime(time);
    } else {
      time = base10Int(time);
    }
    if (!isNaN(time)) {
      this._data[time] = (_.isUndefined(value) ? 0 : value);
    }
    this._cached_times = null;
  };

  /**
   * Get an array of the times that have been explicitly set in the series
   * @param  {array} include (optional) list of timestamps to include in the response
   * @return {array} An array of integer times.
   */
  this.ZeroFilled.prototype.getOrderedTimes = function (include) {
    var times = _.map(_.keys(this._data), base10Int);
    if (_.isArray(include)) {
      times = times.concat(include);
    }
    return _.uniq(times.sort(), true);
  };

  /**
   * return the rows in the format:
   * [ [time, value], [time, value], ... ]
   *
   * Heavy lifting is done by _get(Min|All)FlotPairs()
   * @param  {array} required_times  An array of timestamps that must be in the resulting pairs
   * @return {array}
   */
  this.ZeroFilled.prototype.getFlotPairs = function (required_times) {
    var times = this.getOrderedTimes(required_times),
      strategy,
      pairs,
      pairs_empty;

    if(this.opts.fill_style === 'all') {
      strategy = this._getAllFlotPairs;
    } else {
      strategy = this._getMinFlotPairs;
    }

    pairs = _.reduce(
      times,    // what
      strategy, // how
      [],       // where
      this      // context
    );

    // if the start and end of the pairs are inside either the start or end time,
    // add those times to the series with null values so the graph will stretch to contain them.
    if (this.start_time && (pairs.length === 0 || pairs[0][0] > this.start_time)) {
      pairs.unshift([this.start_time, null]);
    }
    if (this.end_time && (pairs.length === 0 || pairs[pairs.length - 1][0] < this.end_time)) {
      pairs.push([this.end_time, null]);
    }

    return pairs;
  };

  /**
   * ** called as a reduce stragegy in getFlotPairs() **
   * Fill zero's on either side of the current time, unless there is already a measurement there or
   * we are looking at an edge.
   * @return {array} An array of points to plot with flot
   */
  this.ZeroFilled.prototype._getMinFlotPairs = function (result, time, i, times) {
    var next, expected_next, prev, expected_prev;

    // check for previous measurement
    if (i > 0) {
      prev = times[i - 1];
      expected_prev = time - this.interval_ms;
      if (prev < expected_prev) {
        result.push([expected_prev, 0]);
      }
    }

    // add the current time
    result.push([ time, this._data[time] || 0 ]);

    // check for next measurement
    if (times.length > i) {
      next = times[i + 1];
      expected_next = time + this.interval_ms;
      if (next > expected_next) {
        result.push([expected_next, 0]);
      }
    }

    return result;
  };

  /**
   * ** called as a reduce stragegy in getFlotPairs() **
   * Fill zero's to the right of each time, until the next measurement is reached or we are at the
   * last measurement
   * @return {array}  An array of points to plot with flot
   */
  this.ZeroFilled.prototype._getAllFlotPairs = function (result, time, i, times) {
    var next, expected_next;

    result.push([ times[i], this._data[times[i]] || 0 ]);
    next = times[i + 1];
    expected_next = times[i] + this.interval_ms;
    for(; times.length > i && next > expected_next; expected_next+= this.interval_ms) {
      result.push([expected_next, 0]);
    }

    return result;
  };

});
