/** @scratch /panels/5
 *
 * include::panels/multifieldhistogram.asciidoc[]
 */

/** @scratch /panels/multifieldhistogram/0
 *
 * == multifieldhistogram
 * Status: *Stable*
 *
 * The multifieldhistogram panel allow for the display of time charts. It includes several modes and tranformations
 * to display event counts, mean, min, max and total of numeric fields, and derivatives of counter
 * fields, just like the histogram panel. It provides a bit more flexibility than the histogram by allowing
 * to use different fields.
 *
 */
define([
  'angular',
  'app',
  'jquery',
  'lodash',
  'kbn',
  'moment',
  './timeSeries',
  'numeral',
  'jquery.flot',
  'jquery.flot.events',
  'jquery.flot.selection',
  'jquery.flot.time',
  'jquery.flot.byte',
  'jquery.flot.stack',
  'jquery.flot.stackpercent'
],
function (angular, app, $, _, kbn, moment, timeSeries, numeral) {

  'use strict';

  var module = angular.module('kibana.panels.multifieldhistogram', []);
  app.useModule(module);

  module.controller('multifieldhistogram', function($scope, querySrv, dashboard, filterSrv) {
    $scope.panelMeta = {
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      editorTabs : [
        {
          title:'Style',
          src:'app/panels/multifieldhistogram/styleEditor.html'
        },
        {
          title:'Markers',
          src:'app/panels/multifieldhistogram/markersEditor.html'
        },
      ],
      status  : "Stable",
      description : "A bucketed time series chart of the current query or queries. Uses the "+
        "Elasticsearch date_histogram facet. If using time stamped indices this panel will query"+
        " them sequentially to attempt to apply the lighest possible load to your Elasticsearch cluster"
    };

    // Set and populate defaults
    $scope.defaultValue = {
      /** m ode:: Value to use for the y-axis. For all modes other than count, +value_field+ must be
       * defined. Possible values: count, mean, max, min, total.
       */
      mode          : 'count',
      /** @scratch /panels/multifieldhistogram/3
       * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
       */
      value_field   : null,
      /** @scratch /panels/multifieldhistogram/3
       * scale:: Scale the y-axis by this factor
       */
      scale         : 1,
      /** @scratch /panels/multifieldhistogram/3
       * zerofill:: Improves the accuracy of line charts at a small performance cost.
       */
      zerofill      : true,
      /** @scratch /panels/multifieldhistogram/3
       * derivative:: Show each point on the x-axis as the change from the previous point
       */
      derivative    : false,
      /** @scratch /panels/multifieldhistogram/5
       * queries array:: which query ids are selected.
       */
      queries     : [],
      color       : null,
      alias       : null
    };
    
    var _d = {
      /** @scra tch /panels/multifieldhistogram/3
       *
       * === Parameters
       * ==== Axis options
       *
       */
      /** @scratch /panels/multifieldhistogram/3
       * values:: array of values.
       */
      values        : [angular.copy($scope.defaultValue)],
      /** @scratch /panels/multifieldhistogram/3
       * time_field:: x-axis field. This must be defined as a date type in Elasticsearch.
       */
      time_field    : '@timestamp',
      /** @scratch /panels/multifieldhistogram/3
       * x-axis:: Show the x-axis
       */
      'x-axis'      : true,
      /** @scratch /panels/multifieldhistogram/3
       * y-axis:: Show the y-axis
       */
      'y-axis'      : true,
      /** @scratch /panels/multifieldhistogram/3
       * y_format:: 'none','bytes','short '
       */
      y_format    : 'none',
      /** @scratch /panels/multifieldhistogram/5
       * grid object:: Min and max y-axis values
       * grid.min::: Minimum y-axis value
       * grid.max::: Maximum y-axis value
       */
      grid          : {
        max: null,
        min: 0
      },
      /** @scratch /panels/multifieldhistogram/3
       *
       * ==== Annotations
       * annotate object:: A query can be specified, the results of which will be displayed as markers on
       * the chart. For example, for noting code deploys.
       * annotate.enable::: Should annotations, aka markers, be shown?
       * annotate.query::: Lucene query_string syntax query to use for markers.
       * annotate.size::: Max number of markers to show
       * annotate.field::: Field from documents to show
       * annotate.sort::: Sort array in format [field,order], For example [`@timestamp',`desc']
       */
      annotate      : {
        enable      : false,
        query       : "*",
        size        : 20,
        field       : '_type',
        sort        : ['_score','desc']
      },
      /** @scratch /panels/multifieldhistogram/3
       * ==== Interval options
       * auto_int:: Automatically scale intervals?
       */
      auto_int      : true,
      /** @scratch /panels/multifieldhistogram/3
       * resolution:: If auto_int is true, shoot for this many points.
       */
      resolution    : 100,
      /** @scratch /panels/multifieldhistogram/3
       * interval:: If auto_int is set to false, use this as the interval.
       */
      interval      : '5m',
      /** @scratch /panels/multifieldhistogram/3
       * interval:: Array of possible intervals in the *View* selector. Example [`auto',`1s',`5m',`3h']
       */
      intervals     : ['auto','1s','1m','5m','10m','30m','1h','3h','12h','1d','1w','1y'],
      /** @scratch /panels/multifieldhistogram/3
       * ==== Drawing options
       * lines:: Show line chart
       */
      lines         : true,
      /** @scratch /panels/multifieldhistogram/3
       * fill:: Area fill factor for line charts, 1-10
       */
      fill          : 0,
      /** @scratch /panels/multifieldhistogram/3
       * linewidth:: Weight of lines in pixels
       */
      linewidth     : 3,
      /** @scratch /panels/multifieldhistogram/3
       * points:: Show points on chart
       */
      points        : false,
      /** @scratch /panels/multifieldhistogram/3
       * pointradius:: Size of points in pixels
       */
      pointradius   : 5,
      /** @scratch /panels/multifieldhistogram/3
       * stack:: Stack multiple series
       */
      stack         : true,
      /** @scratch /panels/multifieldhistogram/3
       * spyable:: Show inspect icon
       */
      spyable       : true,
      /** @scratch /panels/multifieldhistogram/3
       * zoomlinks:: Show `Zoom Out' link
       */
      zoomlinks     : true,
      /** @scratch /panels/multifieldhistogram/3
       * options:: Show quick view options section
       */
      options       : true,
      /** @scratch /panels/multifieldhistogram/3
       * legend:: Display the legond
       */
      legend        : true,
      /** @scratch /panels/multifieldhistogram/3
       * show_query:: If no alias is set, should the query be displayed?
       */
      show_query    : true,
      /** @scratch /panels/multifieldhistogram/3
       * interactive:: Enable click-and-drag to zoom functionality
       */
      interactive   : true,
      /** @scratch /panels/multifieldhistogram/3
       * legend_counts:: Show counts in legend
       */
      legend_counts : true,
      /** @scratch /panels/multifieldhistogram/3
       * ==== Transformations
       * timezone:: Correct for browser timezone?. Valid values: browser, utc
       */
      timezone      : 'browser', // browser or utc
      /** @scratch /panels/multifieldhistogram/3
       * percentage:: Show the y-axis as a percentage of the axis total. Only makes sense for multiple
       * queries
       */
      percentage    : false,
       /** @scratch /panels/multifieldhistogram/3
       * tooltip object::
       * tooltip.value_type::: Individual or cumulative controls how tooltips are display on stacked charts
       * tooltip.query_as_alias::: If no alias is set, should the query be displayed?
       */
      tooltip       : {
        value_type: 'cumulative',
        query_as_alias: true
      }
    };

    _.defaults($scope.panel,_d);
    _.defaults($scope.panel.tooltip,_d.tooltip);
    _.defaults($scope.panel.annotate,_d.annotate);
    _.defaults($scope.panel.grid,_d.grid);



    $scope.init = function() {
      // Hide view options by default
      $scope.options = false;

      // Always show the query if an alias isn't set. Users can set an alias if the query is too
      // long
      $scope.panel.tooltip.query_as_alias = true;

      $scope.get_data();

    };

    $scope.set_interval = function(interval) {
      if(interval !== 'auto') {
        $scope.panel.auto_int = false;
        $scope.panel.interval = interval;
      } else {
        $scope.panel.auto_int = true;
      }
    };

    $scope.interval_label = function(interval) {
      return $scope.panel.auto_int && interval === $scope.panel.interval ? interval+" (auto)" : interval;
    };

    /**
     * The time range effecting the panel
     * @return {[type]} [description]
     */
    $scope.get_time_range = function () {
      var range = $scope.range = filterSrv.timeRange('last');
      return range;
    };

    $scope.get_alias = function (value, query) {
      var alias = '';
      var isCount = value.mode === 'count';
      if (value.alias) {
        alias += value.alias;
      } else {
        if (query.alias) {
          alias += query.alias;
        } else {
          if (isCount) {
            alias += $scope.panel.show_query ? query.query||'*' : '';
          } else {
            alias += $scope.panel.show_query ? '('+(query.query||'*')+')' : '';
          }
        }
        alias += !isCount && value.value_field ? (alias && '.')+value.value_field : '';
        alias = alias ? value.mode + '(' + alias + ')' : value.mode;
      }
      return alias;
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
    $scope.get_data = function(data, segment, query_id) {
      var
        _range,
        _interval,
        request,
        queries,
        results;

      if (_.isUndefined(segment)) {
        segment = 0;
      }
      delete $scope.panel.error;

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }
      _range = $scope.get_time_range();
      _interval = $scope.get_interval(_range);

      if ($scope.panel.auto_int) {
        $scope.panel.interval = kbn.secondsToHms(
          kbn.calculate_interval(_range.from,_range.to,$scope.panel.resolution,0)/1000);
      }

      $scope.panelMeta.loading = true;
      request = $scope.ejs.Request().indices(dashboard.indices[segment]);
      if (!$scope.panel.annotate.enable) {
        request.searchType("count");
      }

      // Build the queries
      _.each($scope.panel.values, function(panel_value, panel_value_index) {
        queries = querySrv.getQueryObjs(panel_value.queries);
        _.each(queries, function(q) {
          var serie_id = panel_value_index.toString()+"_"+q.id.toString();
          var query = $scope.ejs.FilteredQuery(
            querySrv.toEjsObj(q),
            filterSrv.getBoolFilter(filterSrv.ids())
          );

          var facet = $scope.ejs.DateHistogramFacet(serie_id);

          if(panel_value.mode === 'count') {
            facet = facet.field($scope.panel.time_field).global(true);
          } else {
            if(_.isNull(panel_value.value_field)) {
              $scope.panel.error = "In " + panel_value.mode + " mode a field must be specified";
              return;
            }
            facet = facet.keyField($scope.panel.time_field).valueField(panel_value.value_field).global(true);
          }
          facet = facet.interval(_interval).facetFilter($scope.ejs.QueryFilter(query));
          request = request.facet(facet)
            .size($scope.panel.annotate.enable ? $scope.panel.annotate.size : 0);
        });
      });

      // Annotate query
      if($scope.panel.annotate.enable) {
        var query = $scope.ejs.FilteredQuery(
          $scope.ejs.QueryStringQuery($scope.panel.annotate.query || '*'),
          filterSrv.getBoolFilter(filterSrv.idsByType('time'))
        );
        request = request.query(query);

        // This is a hack proposed by @boaz to work around the fact that we can't get
        // to field data values directly, and we need timestamps as normalized longs
        request = request.sort([
          $scope.ejs.Sort($scope.panel.annotate.sort[0]).order($scope.panel.annotate.sort[1]).ignoreUnmapped(true),
          $scope.ejs.Sort($scope.panel.time_field).desc().ignoreUnmapped(true)
        ]);
      }

      // Populate the inspector panel
      $scope.populate_modal(request);

      // Then run it
      results = request.doSearch();

      // Populate scope when we have results
      return results.then(function(results) {
        $scope.panelMeta.loading = false;
        if(segment === 0) {
          $scope.legend = {};
          $scope.hits = 0;
          data = {};
          $scope.annotations = [];
          query_id = $scope.query_id = new Date().getTime();
        }

        // Check for error and abort if found
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error);
        }
        // Make sure we're still on the same query/queries
        else if($scope.query_id === query_id) {

          var time_series,
            hits,
            counters; // Stores the bucketed hit counts.
          
          _.each($scope.panel.values, function(panel_value, panel_value_index) {
            queries = querySrv.getQueryObjs(panel_value.queries);
            _.each(queries, function(q) {
              var serie_id = panel_value_index.toString()+"_"+q.id.toString();
              var query_results = results.facets[serie_id];
              // we need to initialize the data variable on the first run,
              // and when we are working on the first segment of the data.
              if(_.isUndefined(data[serie_id]) || segment === 0) {
                var tsOpts = {
                  interval: _interval,
                  start_date: _range && _range.from,
                  end_date: _range && _range.to,
                  fill_style: panel_value.derivative ? 'null' : panel_value.zerofill ? 'minimal' : 'no'
                };
                time_series = new timeSeries.ZeroFilled(tsOpts);
                hits = 0;
                counters = {};
              } else {
                time_series = data[serie_id].time_series;
                hits = data[serie_id].hits;
                counters = data[serie_id].counters;
              }

              // push each entry into the time series, while incrementing counters
              _.each(query_results.entries, function(entry) {
                var value;

                hits += entry.count; // The series level hits counter
                $scope.hits += entry.count; // Entire dataset level hits counter
                counters[entry.time] = (counters[entry.time] || 0) + entry.count;

                if(panel_value.mode === 'count') {
                  value = (time_series._data[entry.time] || 0) + entry.count;
                } else if (panel_value.mode === 'mean') {
                  // Compute the ongoing mean by
                  // multiplying the existing mean by the existing hits
                  // plus the new mean multiplied by the new hits
                  // divided by the total hits
                  value = (((time_series._data[entry.time] || 0)*(counters[entry.time]-entry.count)) +
                    entry.mean*entry.count)/(counters[entry.time]);
                } else if (panel_value.mode === 'min'){
                  if(_.isUndefined(time_series._data[entry.time])) {
                    value = entry.min;
                  } else {
                    value = time_series._data[entry.time] < entry.min ? time_series._data[entry.time] : entry.min;
                  }
                } else if (panel_value.mode === 'max'){
                  if(_.isUndefined(time_series._data[entry.time])) {
                    value = entry.max;
                  } else {
                    value = time_series._data[entry.time] > entry.max ? time_series._data[entry.time] : entry.max;
                  }
                } else if (panel_value.mode === 'total'){
                  value = (time_series._data[entry.time] || 0) + entry.total;
                }
                time_series.addValue(entry.time, value);
              });

              var info = {
                color: panel_value.color || q.color,
                alias: $scope.get_alias(panel_value, q),
              };
              
              $scope.legend[serie_id] = {query:info,hits:hits};

              data[serie_id] = {
                info: info,
                time_series: time_series,
                hits: hits,
                counters: counters
              };
            });
          });

          if($scope.panel.annotate.enable) {
            $scope.annotations = $scope.annotations.concat(_.map(results.hits.hits, function(hit) {
              var _p = _.omit(hit,'_source','sort','_score');
              var _h = _.extend(kbn.flatten_json(hit._source),_p);
              return  {
                min: hit.sort[1],
                max: hit.sort[1],
                eventType: "annotation",
                title: null,
                description: "<small><i class='icon-tag icon-flip-vertical'></i> "+
                  _h[$scope.panel.annotate.field]+"</small><br>"+
                  moment(hit.sort[1]).format('YYYY-MM-DD HH:mm:ss'),
                score: hit.sort[0]
              };
            }));
            // Sort the data
            $scope.annotations = _.sortBy($scope.annotations, function(v){
              // Sort in reverse
              return v.score*($scope.panel.annotate.sort[1] === 'desc' ? -1 : 1);
            });
            // And slice to the right size
            $scope.annotations = $scope.annotations.slice(0,$scope.panel.annotate.size);
          }
        }

        // Tell the multifieldhistogram directive to render.
        $scope.$emit('render', data);

        // If we still have segments left, get them
        if(segment < dashboard.indices.length-1) {
          $scope.get_data(data,segment+1,query_id);
        }

      });

    };

    // function $scope.zoom
    // factor :: Zoom factor, so 0.5 = cuts timespan in half, 2 doubles timespan
    $scope.zoom = function(factor) {
      var _range = filterSrv.timeRange('last');
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
        from:moment.utc(_from).toDate(),
        to:moment.utc(_to).toDate(),
        field:$scope.panel.time_field
      });
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

    $scope.render = function() {
      $scope.$emit('render');
    };
    
    $scope.add_new_value = function(panel) {
      panel.values.push(angular.copy($scope.defaultValue));
    };

  });

  module.directive('multifieldhistogramChart', function(dashboard, filterSrv) {
    return {
      restrict: 'A',
      template: '<div></div>',
      link: function(scope, elem) {
        var data, plot;

        scope.$on('refresh',function(){
          scope.get_data();
        });

        // Receive render events
        scope.$on('render',function(event,d){
          data = d || data;
          render_panel(_.values(data));
        });

        var scale = function(series,factor) {
          return _.map(series,function(p) {
            return [p[0],p[1]*factor];
          });
        };

        var scaleSeconds = function(series,interval) {
          return _.map(series,function(p) {
            return [p[0],p[1]/kbn.interval_to_seconds(interval)];
          });
        };

        var derivative = function(series) {
          return _.map(series, function(p,i) {
            var _v;
            if(i === 0 || p[1] === null) {
              _v = [p[0],null];
            } else {
              _v = series[i-1][1] === null ? [p[0],null] : [p[0],p[1]-(series[i-1][1])];
            }
            return _v;
          });
        };

        // Function for rendering panel
        function render_panel(data) {
          // IE doesn't work without this
          try {
            elem.css({height:scope.panel.height||scope.row.height});
          } catch(e) {return;}

          // Populate from the query service
          try {
            _.each(data, function(series) {
              series.label = series.info.alias;
              series.color = series.info.color;
            });
          } catch(e) {return;}


          var stack = scope.panel.stack ? true : null;

          // Populate element
          try {
            var options = {
              legend: { show: false },
              series: {
                stackpercent: scope.panel.stack ? scope.panel.percentage : false,
                stack: scope.panel.percentage ? null : stack,
                lines:  {
                  show: scope.panel.lines,
                  // Silly, but fixes bug in stacked percentages
                  fill: scope.panel.fill === 0 ? 0.001 : scope.panel.fill/10,
                  lineWidth: scope.panel.linewidth,
                  steps: false
                },
                points: {
                  show: scope.panel.points,
                  fill: 1,
                  fillColor: false,
                  radius: scope.panel.pointradius
                },
                shadowSize: 1
              },
              yaxis: {
                show: scope.panel['y-axis'],
                min: scope.panel.grid.min,
                max: scope.panel.percentage && scope.panel.stack ? 100 : scope.panel.grid.max
              },
              xaxis: {
                timezone: scope.panel.timezone,
                show: scope.panel['x-axis'],
                mode: "time",
                min: _.isUndefined(scope.range.from) ? null : scope.range.from.getTime(),
                max: _.isUndefined(scope.range.to) ? null : scope.range.to.getTime(),
                timeformat: time_format(scope.panel.interval),
                label: "Datetime",
                ticks: elem.width()/100
              },
              grid: {
                backgroundColor: null,
                borderWidth: 0,
                hoverable: true,
                color: '#c8c8c8'
              }
            };

            if (scope.panel.y_format === 'bytes') {
              options.yaxis.mode = "byte";
              options.yaxis.tickFormatter = function (val, axis) {
                return kbn.byteFormat(val, 0, axis.tickSize);
              };
            }

            if (scope.panel.y_format === 'short') {
              options.yaxis.tickFormatter = function (val, axis) {
                return kbn.shortFormat(val, 0, axis.tickSize);
              };
            }

            if(scope.panel.annotate.enable) {
              options.events = {
                clustering: true,
                levels: 1,
                data: scope.annotations,
                types: {
                  'annotation': {
                    level: 1,
                    icon: {
                      width: 20,
                      height: 21,
                      icon: "histogram-marker"
                    }
                  }
                }
                //xaxis: int    // the x axis to attach events to
              };
            }

            if(scope.panel.interactive) {
              options.selection = { mode: "x", color: '#666' };
            }

            // when rendering stacked, we need to ensure each point that has data is zero-filled
            // so that the stacking happens in the proper order
            var required_times = [];
            if (data.length > 1) {
              required_times = Array.prototype.concat.apply([], _.map(data, function (query) {
                return query.time_series.getOrderedTimes();
              }));
              required_times = _.uniq(required_times.sort(function (a, b) {
                // decending numeric sort
                return a-b;
              }), true);
            }


            for (var i = 0; i < data.length; i++) {
              var _d = data[i].time_series.getFlotPairs(required_times);
              if(scope.panel.values[i].derivative) {
                _d = derivative(_d);
              }
              if(scope.panel.values[i].scale !== 1) {
                _d = scale(_d,scope.panel.values[i].scale);
              }
              if(scope.panel.scaleSeconds) {
                _d = scaleSeconds(_d,scope.panel.interval);
              }
              data[i].data = _d;
            }

            plot = $.plot(elem, data, options);

          } catch(e) {
            // Nothing to do here
          }
        }

        function time_format(interval) {
          var _int = kbn.interval_to_seconds(interval);
          if(_int >= 2628000) {
            return "%Y-%m";
          }
          if(_int >= 86400) {
            return "%Y-%m-%d";
          }
          if(_int >= 60) {
            return "%H:%M<br>%m-%d";
          }

          return "%H:%M:%S";
        }

        var $tooltip = $('<div>');
        elem.bind("plothover", function (event, pos, item) {
          var group, value, timestamp, interval;
          interval = " per " + (scope.panel.scaleSeconds ? '1s' : scope.panel.interval);
          if (item) {
            if (item.series.info.alias || scope.panel.tooltip.query_as_alias) {
              group = '<small style="font-size:0.9em;">' +
                '<i class="icon-circle" style="color:'+item.series.color+';"></i>' +
                ' ' + item.series.info.alias + '</small><br>';
            } else {
              group = kbn.query_color_dot(item.series.color, 15) + ' ';
            }
            value = (scope.panel.stack && scope.panel.tooltip.value_type === 'individual') ?
              item.datapoint[1] - item.datapoint[2] :
              item.datapoint[1];
            if(scope.panel.y_format === 'bytes') {
              value = kbn.byteFormat(value,2);
            }
            if(scope.panel.y_format === 'short') {
              value = kbn.shortFormat(value,2);
            } else {
              value = numeral(value).format('0,0[.]000');
            }
            timestamp = scope.panel.timezone === 'browser' ?
              moment(item.datapoint[0]).format('YYYY-MM-DD HH:mm:ss') :
              moment.utc(item.datapoint[0]).format('YYYY-MM-DD HH:mm:ss');
            $tooltip
              .html(
                group + value + interval + " @ " + timestamp
              )
              .place_tt(pos.pageX, pos.pageY);
          } else {
            $tooltip.detach();
          }
        });

        elem.bind("plotselected", function (event, ranges) {
          filterSrv.set({
            type  : 'time',
            from  : moment.utc(ranges.xaxis.from).toDate(),
            to    : moment.utc(ranges.xaxis.to).toDate(),
            field : scope.panel.time_field
          });
        });
      }
    };
  });

});
