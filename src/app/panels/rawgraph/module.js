/** @scratch /panels/5
 * include::panels/rawgraph.asciidoc[]
 */

/** @scratch /panels/rawgraph/0
 * == Rawgraph
 * Status: *Alpha*
 *
 * The rawgraph panel allow for the display of time charts. It draws real values.
 * That means this panel doesn't uses facetting.
 *
 */
define([
  'angular',
  'app',
  'jquery',
  'lodash',
  'kbn',
  'moment',
  'numeral',
  'jquery.flot',
  'jquery.flot.events',
  'jquery.flot.selection',
  'jquery.flot.time',
  'jquery.flot.stack',
  'jquery.flot.stackpercent'
],
function (angular, app, $, _, kbn, moment, numeral) {

  'use strict';

  var module = angular.module('kibana.panels.rawgraph', []);
  app.useModule(module);

  module.controller('rawgraph', function($scope, querySrv, dashboard, filterSrv) {
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
          src:'app/panels/rawgraph/styleEditor.html'
        },
        {
          title:'Queries',
          src:'app/panels/rawgraph/queriesEditor.html'
        },
      ],
      status  : "Alpha",
      description : "A bucketed time series chart of the current query or queries. Please note that "+
        "this panel doesn't use facetting."
    };
    // Set and populate defaults
    var _d = {
      /** @scratch /panels/rawgraph/3
       * max_point:: Maximum values to get from elasticsearch.
       */
      max_point   : 5000,
      /** @scratch /panels/rawgraph/3
       * time_field:: x-axis field. This must be defined as a date type in Elasticsearch.
       */
      time_field  : '@timestamp',
      /** @scratch /panels/rawgraph/5
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries       : {
        mode          : 'all',
        ids           : []
      },
      series : [ {value_field : 'value', hide: false}, {value_field : 'max', hide: false} ],
      /** @scratch /panels/rawgraph/3
       * fill:: Area fill factor for line charts, 1-10
       */
      fill        : 0,
      /** @scratch /panels/rawgraph/3
       * linewidth:: Weight of lines in pixels
       */
      linewidth   : 1,
      /** @scratch /panels/rawgraph/3
       * pointradius:: Size of points in pixels
       */
      pointradius : 3,
      /** @scratch /panels/rawgraph/3
       * ==== Transformations
       * timezone:: Correct for browser timezone?. Valid values: browser, utc
       */
      timezone    : 'browser', // browser, utc or a standard timezone
      /** @scratch /panels/rawgraph/3
       * spyable:: Show inspect icon
       */
      spyable     : true,
      /** @scratch /panels/rawgraph/3
       * zoomlinks:: Show `Zoom Out' link
       */
      zoomlinks   : true,
      /** @scratch /panels/rawgraph/3
       * bars:: Show bars on chart
       */
      bars        : false,
      /** @scratch /panels/rawgraph/3
       * stack:: Stack multiple series
       */
      stack       : false,
      /** @scratch /panels/rawgraph/3
       * points:: Show points on chart
       */
      points      : false,
      /** @scratch /panels/rawgraph/3
       * ==== Drawing options
       * lines:: Show line chart
       */
      lines       : true,
      /** @scratch /panels/rawgraph/3
       * legend:: Display the legend
       */
      legend      : true,
      /** @scratch /panels/rawgraph/3
       * x-axis:: Show the x-axis
       */
      'x-axis'    : true,
      /** @scratch /panels/rawgraph/3
       * y-axis:: Show the y-axis
       */
      'y-axis'    : true,
      /** @scratch /panels/rawgraph/3
       * percentage:: Show the y-axis as a percentage of the axis total. Only makes sense for multiple
       * queries
       */
      percentage  : false,
      /** @scratch /panels/rawgraph/3
       * interactive:: Enable click-and-drag to zoom functionality
       */
      interactive : true,
      /** @scratch /panels/rawgraph/3
       * options:: Show quick view options section
       */
      options       : true,
      /** @scratch /panels/rawgraph/5
       * grid object:: Min and max y-axis values
       * grid.min::: Minimum y-axis value
       * grid.max::: Maximum y-axis value
       */
      grid          : {
        max: null,
        min: 0
      },
      /** @scratch /panels/rawgraph/5
       * colors:: Colors of the series
       */
      colors        : [
        "#7EB26D","#EAB839","#6ED0E0","#EF843C","#E24D42","#1F78C1","#BA43A9","#705DA0",
        "#508642","#CCA300","#447EBC","#C15C17","#890F02","#0A437C","#6D1F62","#584477",
        "#B7DBAB","#F4D598","#70DBED","#F9BA8F","#F29191","#82B5D8","#E5A8E2","#AEA2E0",
        "#629E51","#E5AC0E","#64B0C8","#E0752D","#BF1B00","#0A50A1","#962D82","#614D93",
        "#9AC48A","#F2C96D","#65C5DB","#F9934E","#EA6460","#5195CE","#D683CE","#806EB7",
        "#3F6833","#967302","#2F575E","#99440A","#58140C","#052B51","#511749","#3F2B5B",
        "#E0F9D7","#FCEACA","#CFFAFF","#F9E2D2","#FCE2DE","#BADFF4","#F9D9F9","#DEDAF7"
      ]
    };
    _.defaults($scope.panel,_d);
    _.defaults($scope.panel.grid,_d.grid);


    $scope.init = function() {
      // Hide view options by default
      $scope.options = false;

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
        request,
        queries,
        boolQuery,
        results;

      if (_.isUndefined(segment)) {
        segment = 0;
      }
      delete $scope.panel.error;

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;
      request = $scope.ejs.Request().indices(dashboard.indices[segment]);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

      queries = querySrv.getQueryObjs($scope.panel.queries.ids);
      
      boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      var fieldQuery=[];
      _.each($scope.panel.series, function(item) {
        if ((!item.hide) && (typeof item.value_field !== 'undefined')) {
          fieldQuery.push($scope.ejs.ExistsFilter(item.value_field));
        }
      });
      var filterPart=[];
      //filterPart[0]=$scope.ejs.ExistsFilter($scope.panel.value_field);
      filterPart[0]=$scope.ejs.OrFilter(fieldQuery);
      filterPart[1]=filterSrv.getBoolFilter(filterSrv.ids);
      var filterQuery=$scope.ejs.AndFilter(filterPart);
      
      request = request.query(
        $scope.ejs.FilteredQuery(
          boolQuery,
          filterQuery
        ))
        .size($scope.panel.max_point)
        .sort($scope.panel.time_field, "desc");

      // Populate the inspector panel
      $scope.populate_modal(request);

      // Then run it
      results = request.doSearch();

      // Populate scope when we have results
      return results.then(function(results) {
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

        // Check that we're still on the same query, if not stop
        if($scope.query_id === query_id) {
          $scope.data= $scope.data.concat(_.map(results.hits.hits, function(hit) {
            return {
              _source   : kbn.flatten_json(hit._source),
              highlight : kbn.flatten_json(hit.highlight||{})
            };
          }));
          $scope.hits += results.hits.total;

          // Create the flot series object for visible series
          $scope.plotseries = [];
          _.each($scope.panel.series, function(item, index) {
            if (!item.hide) {
              $scope.plotseries.push({
                data: [],
                hits: 0,
                info: {
                  alias:item.value_field,
                  color: $scope.panel.colors[index],
                }
              });
            }
          });

          // Get data and assign in their own series
          _.each($scope.data, function(item_data) {
            // Not convinced by that
            var cached_time_field=null;
            _.each($scope.plotseries, function(item_series, index_series) {
              if (typeof item_data._source[item_series.info.alias] === 'number'
               && typeof item_data._source[$scope.panel.time_field] !== 'undefined'
               && item_data._source[$scope.panel.time_field] !== null ) {
                if (cached_time_field === null)
                {
                  // Timestamp parsing
                  var parts = item_data._source[$scope.panel.time_field].split('T'),
                  dateParts = parts[0].split('-'),
                  timeParts = parts[1].split('Z')[0].split('+'),
                  timeSubParts = timeParts[0].split(':'),
                  timeSecParts = timeSubParts[2].split('.')[0].split(','),
                  _date = new Date;
                  _date.setUTCFullYear(Number(dateParts[0]));
                  _date.setUTCMonth(Number(dateParts[1])-1);
                  _date.setUTCDate(Number(dateParts[2]));
                  _date.setUTCHours(Number(timeSubParts[0]));
                  _date.setUTCMinutes(Number(timeSubParts[1]));
                  _date.setUTCSeconds(Number(timeSecParts[0]));
                  if (timeSecParts[1]) {
                    _date.setUTCMilliseconds(Number(timeSecParts[1]));
                  }

                  cached_time_field=_date.getTime();
                }
                $scope.plotseries[index_series].data.push([cached_time_field, item_data._source[item_series.info.alias]]);
                $scope.plotseries[index_series].hits += 1;
              }
            });
          });

          // Tell the histogram directive to render.
          $scope.$emit('render', $scope.plotseries);

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

    $scope.add_series = function (value) {
      var new_series = {
        value_field: value,
        hide: false
      };
      this.panel.series.push(new_series);
      $scope.refresh =  true;
    };

    $scope.render = function() {
        $scope.$emit('render');
      };

  });

  module.directive('rawgraphChart', function(dashboard, filterSrv) {
    return {
      restrict: 'A',
      template: '<div></div>',
      link: function(scope, elem) {
        var data;

        scope.$on('refresh',function(){
          scope.get_data();
        });

        // Receive render events
        scope.$on('render',function(event,d){
          data = d || data;
          render_panel(data);
        });

        // Re-render if the window is resized
        angular.element(window).bind('resize', function(){
          render_panel(data);
        });

        // Function for rendering panel
        function render_panel(data) {

          // IE doesn't work without this
          elem.css({height:scope.panel.height||scope.row.height});

          if (scope.plotseries.length === 0) {
            elem.text("No series to draw for the moment");
            return;
          } else {
            elem.text("");
          }

          // Populate from the query service
          try {
            _.each(data,function(series) {
              series.label = series.info.alias;
              series.color = series.info.color;
            });
          } catch(e) {
            elem.text("Something is wrong about alias series or color series");
            return;
          }

          var stack = scope.panel.stack ? true : null;

          // Populate element
          try {
            if (_.isUndefined(scope.range)) {
              scope.range=[];
            }
            var options = {
              legend: { show: false },
              series: {
                stackpercent: scope.panel.stack ? scope.panel.percentage : false,
                stack: scope.panel.percentage ? null : stack,
                lines:  {
                  show: scope.panel.lines,
                  fill: scope.panel.fill/10,
                  lineWidth: scope.panel.linewidth,
                  steps: false
                },
                bars:   { show: scope.panel.bars,  fill: 1, barWidth: 1 },
                points: { show: scope.panel.points, fill: 1, fillColor: false, radius: 5},
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
                timeformat: "%H:%M:%S",
                label: "Datetime",
                ticks: elem.width()/100
              },
              grid: {
                backgroundColor: null,
                borderWidth: 0,
                borderColor: '#eee',
                hoverable: true,
                color: "#c8c8c8"
              },
              colors: ['#86B22D','#BF6730','#1D7373','#BFB930','#BF3030','#77207D']
            };

            if(scope.panel.interactive) {
              options.selection = { mode: "x", color: '#aaa' };
            }

            scope.plot = $.plot(elem, data, options);

            // Work around for missing legend at initialization.
            if(!scope.$$phase) {
              scope.$apply();
            }

          } catch(e) {
            elem.text(e);
          }
        }

        var $tooltip = $('<div>');
        elem.bind("plothover", function (event, pos, item) {
          var group, value, timestamp;
          if (item) {
            if (item.series.info.alias || scope.panel.tooltip.query_as_alias) {
              group = '<small style="font-size:0.9em;">' +
                '<i class="icon-circle" style="color:'+item.series.color+';"></i>' + ' ' +
                (item.series.info.alias || item.series.info.query)+
              '</small><br>';
            } else {
              group = kbn.query_color_dot(item.series.color, 15) + ' ';
            }
            value = (scope.panel.stack && scope.panel.tooltip.value_type === 'individual') ?
              item.datapoint[1] - item.datapoint[2] :
              item.datapoint[1];
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
                group + value + " @ " + timestamp
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
