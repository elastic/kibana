/*

  ## Value Histogram

  ### Parameters
  * interval :: Datapoint interval in numeric format (eg 1, 5, 10)
  * fill :: Only applies to line charts. Level of area shading from 0-10
  * linewidth ::  Only applies to line charts. How thick the line should be in pixels
                  While the editor only exposes 0-10, this can be any numeric value.
                  Set to 0 and you'll get something like a scatter plot
  * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query
  * bars :: Show bars in the chart
  * stack :: Stack multiple queries. This generally a crappy way to represent things.
             You probably should just use a line chart without stacking
  * points :: Should circles at the data points on the chart
  * lines :: Line chart? Sweet.
  * legend :: Show the legend?
  * x-axis :: Show x-axis labels and grid lines
  * y-axis :: Show y-axis labels and grid lines

*/
define([
  'angular',
  'app',
  'jquery',
  'underscore',
  'kbn',
  'moment',
  'jquery.flot',
  'jquery.flot.events',
  'jquery.flot.selection',
  'jquery.flot.stack',
  'jquery.flot.stackpercent'
],
function (angular, app, $, _, kbn, moment) {

  'use strict';

  var module = angular.module('kibana.panels.valuehistogram', []);
  app.useModule(module);

  module.controller('valuehistogram', function($scope, querySrv, dashboard, filterSrv) {
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
          src:'app/panels/valuehistogram/styleEditor.html'
        },
        {
          title:'Queries',
          src:'app/panels/valuehistogram/queriesEditor.html'
        },
      ],
      status  : "Stable",
      description : "A bucketed histogram of the current query or queries. Uses the "+
        "Elasticsearch histogram facet. If using time stamped indices this panel will query"+
        " them sequentially to attempt to apply the lighest possible load to your Elasticsearch cluster"
    };

    // Set and populate defaults
    var _d = {
      mode          : 'count',
      key_field     : null,
      value_field   : null,
      queries       : {
        mode          : 'all',
        ids           : []
      },
      annotate      : {
        enable      : false,
        query       : "*",
        size        : 20,
        field       : '_type',
        sort        : ['_score','desc']
      },
      resolution    : 100,
      interval      : 5,
      fill          : 0,
      linewidth     : 3,
      pointradius   : 5,
      timezone      : 'browser', // browser, utc or a standard timezone
      spyable       : true,
      bars          : true,
      stack         : true,
      points        : false,
      lines         : false,
      legend        : true,
      show_query    : true,
      legend_counts : true,
      'x-axis'      : true,
      'y-axis'      : true,
      percentage    : false,
      options       : true,
      scale         : 1,
      tooltip       : {
        value_type: 'cumulative',
        query_as_alias: true
      },
      grid          : {
        max: null,
        min: 0
      }
    };

    _.defaults($scope.panel,_d);
    _.defaults($scope.panel.tooltip,_d.tooltip);
    _.defaults($scope.panel.annotate,_d.annotate);
    _.defaults($scope.panel.grid,_d.grid);



    $scope.init = function() {
      // Hide view options by default
      $scope.options = false;
      $scope.$on('refresh',function(){
        $scope.get_data();
      });

      // Always show the query if an alias isn't set. Users can set an alias if the query is too
      // long
      $scope.panel.tooltip.query_as_alias = true;

      $scope.get_data();

    };

    /**
     * Fetch the data for a chunk of a queries results. Multiple segments occur when several indicies
     * need to be consulted (like timestamped logstash indicies)
     *
     * The results of this function are stored on the scope's data property. This property will be an
     * array of objects with the properties info, series, and hits. These objects are used in the
     * render_panel function to create the historgram.
     *
     * @param {number} segment   The segment count, (0 based)
     * @param {number} query_id  The id of the query, generated on the first run and passed back when
     *                            this call is made recursively for more segments
     */
    $scope.get_data = function(segment, query_id) {
      var
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

      $scope.panelMeta.loading = true;
      request = $scope.ejs.Request().indices(dashboard.indices[segment]);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

      queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      // Build the query
      _.each(queries, function(q) {
        var query = $scope.ejs.FilteredQuery(
          querySrv.toEjsObj(q),
          filterSrv.getBoolFilter(filterSrv.ids)
        );

        var facet = $scope.ejs.HistogramFacet(q.id);

        if($scope.panel.mode === 'count') {
          facet = facet.field($scope.panel.key_field).global(true);
        } else {
          if(_.isNull($scope.panel.value_field)) {
            $scope.panel.error = "In " + $scope.panel.mode + " mode a field must be specified";
            return;
          }
          facet = facet.keyField($scope.panel.key_field).valueField($scope.panel.value_field).global(true);
        }

        facet = facet.interval($scope.panel.interval).facetFilter($scope.ejs.QueryFilter(query));
        request = request.facet(facet)
          .size($scope.panel.annotate.enable ? $scope.panel.annotate.size : 0);
      });

      if($scope.panel.annotate.enable) {
        var query = $scope.ejs.FilteredQuery(
          $scope.ejs.QueryStringQuery($scope.panel.annotate.query || '*'),
          filterSrv.getBoolFilter(filterSrv.idsByType('time'))
        );
        request = request.query(query);

        // This is a hack proposed by @boaz to work around the fact that we can't get
        // to field data values directly, and we need timestamps as normalized longs
        request = request.sort([
          $scope.ejs.Sort($scope.panel.annotate.sort[0]).order($scope.panel.annotate.sort[1]),
          $scope.ejs.Sort($scope.panel.time_field).desc()
        ]);
      }

      // Populate the inspector panel
      $scope.populate_modal(request);

      // Then run it
      results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {

        $scope.panelMeta.loading = false;
        if(segment === 0) {
          $scope.hits = 0;
          $scope.data = [];
          $scope.annotations = [];
          query_id = $scope.query_id = new Date().getTime();
        }

        // Check for error and abort if found
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error);
          return;
        }

        // Make sure we're still on the same query/queries
        if($scope.query_id === query_id) {

          var i = 0,
            series,
            hits;

          _.each(queries, function(q) {
            var query_results = results.facets[q.id];
            // we need to initialize the data variable on the first run,
            // and when we are working on the first segment of the data.
            if(_.isUndefined($scope.data[i]) || segment === 0) {
              series = {};
              hits = 0;
            } else {
              series = $scope.data[i].series;
              hits = $scope.data[i].hits;
            }

            // push each entry into the time series, while incrementing counters
            _.each(query_results.entries, function(entry) {
              if (!(entry.key in series)) {
                series[entry.key] = 0;
              }
              series[entry.key] += entry[$scope.panel.mode];

              hits += entry.count; // The series level hits counter
              $scope.hits += entry.count; // Entire dataset level hits counter
            });
            $scope.data[i] = {
              info: q,
              series: series,
              hits: hits
            };

            i++;
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

          // Tell the histogram directive to render.
          $scope.$emit('render');

          // If we still have segments left, get them
          if(segment < dashboard.indices.length-1) {
            $scope.get_data(segment+1,query_id);
          }
        }
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

  });

  module.directive('valuehistogramChart', function() {
    return {
      restrict: 'A',
      template: '<div></div>',
      link: function(scope, elem) {

        // Receive render events
        scope.$on('render',function(){
          render_panel();
        });

        // Re-render if the window is resized
        angular.element(window).bind('resize', function(){
          render_panel();
        });

        var pairs = function(series) {
          return _.map(_.keys(series), function(key) {
            return [parseInt(key, 10), series[key]];
          });
        };

        var scale = function(series,factor) {
          return _.map(series,function(p) {
            return [p[0],p[1]*factor];
          });
        };

        // Function for rendering panel
        function render_panel() {
          // IE doesn't work without this
          elem.css({height:scope.panel.height || scope.row.height});

          // Populate from the query service
          try {
            _.each(scope.data, function(series) {
              series.label = series.info.alias;
              series.color = series.info.color;
            });
          } catch(e) {return;}

          // Set barwidth based on specified interval
          var barwidth = scope.panel.interval;

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
                bars:   {
                  show: scope.panel.bars,
                  fill: 1,
                  barWidth: barwidth/1.5,
                  zero: false,
                  lineWidth: 0
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
                max: scope.panel.percentage && scope.panel.stack ? 100 : scope.panel.grid.max,
              },
              xaxis: {
                show: scope.panel['x-axis'],
                mode: null,
                min: null,
                max: null,
                label: scope.panel.key_field,
                ticks: elem.width()/100
              },
              grid: {
                backgroundColor: null,
                borderWidth: 0,
                hoverable: true,
                color: '#c8c8c8'
              }
            };

            if(scope.panel.annotate.enable) {
              options.events = {
                levels: 1,
                data: scope.annotations,
                types: {
                  'annotation': {
                    level: 1,
                    icon: {
                      icon: "icon-tag icon-flip-vertical",
                      size: 20,
                      color: "#222",
                      outline: "#bbb"
                    }
                  }
                }
                //xaxis: int    // the x axis to attach events to
              };
            }

            for (var i = 0; i < scope.data.length; i++) {
              var _d = pairs(scope.data[i].series);
              if(scope.panel.scale !== 1) {
                _d = scale(_d, scope.panel.scale);
              }
              scope.data[i].data = _d;
            }

            scope.plot = $.plot(elem, scope.data, options);

          } catch(e) {
            // Nothing to do here
          }
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
            value = (scope.panel.stack && scope.panel.tooltip.value_type === 'individual') ?
              item.datapoint[1] - item.datapoint[2] :
              item.datapoint[1];
            $tooltip
              .html(
                group + value + " @ " + item.datapoint[0]
              )
              .place_tt(pos.pageX, pos.pageY);
          } else {
            $tooltip.detach();
          }
        });
      }
    };
  });

});
