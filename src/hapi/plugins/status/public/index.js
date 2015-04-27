define(['angular', 'jquery', 'lodash', 'moment', 'numeral', 'nvd3', 'nvd3_directives'],
  function (angular, $, _, moment) {

    // Make sure we don't have to deal with statuses by hand
    function getStatus(plugin) {
        var statusMap = {
          green: {
            label: 'success',
            msg: 'Ready',
            idx: 1
          },
          yellow: {
            label: 'warning',
            msg: 'S.N.A.F.U.',
            idx: 2
          },
          red: {
            label: 'danger',
            msg: 'Danger Will Robinson! Danger!',
            idx: 3
          },
          loading: {
            label: 'info',
            msg: 'Loading...',
            idx: 0
          }
        };
        if(!_.isObject(plugin) || _.isUndefined(plugin)) {
          plugin = {state: plugin};
        }
        return statusMap[plugin.state];
    }
    function getLabel(plugin) { return getStatus(plugin).label; }

    // Turns thisIsASentence to
    // This Is A Sentence
    function niceName(name) {
      return name
        .split(/(?=[A-Z])/)
        .map(function(word) { return word[0].toUpperCase() + _.rest(word).join(''); })
        .join(' ');
    }

    function formatNumber(num, which) {
      var format;
      if(which === 'byte') {
        format = '0.0b';
      } else if( which === 'time') {
        format = '00:00:00';
      } else {
        format = '0.00';
      }
      return numeral(num).format(format);
    }
    function numberType(key) {
      var byteMetrics = ['heapTotal', 'heapUsed', 'rss'];
      var timeMetrics = ['delay', 'responseTimeAvg'];
      var preciseMetric = ['requests', 'load', 'responseTimeMax'];
      if( byteMetrics.indexOf(key) > -1 ) {
        return 'byte';
      } else if (timeMetrics.indexOf(key) > -1 ) {
        return 'time';
      } else {
        return 'precise';
      }
    }

    // The Kibana App
    angular.module('KibanaStatusApp', ['nvd3ChartDirectives'])
      .controller('StatusPage', ['$scope', '$http', function($scope, $http) {
        // the object representing all of the elements the ui touches
        $scope.ui = {
          // show the system status by going through all of the plugins,
          // and making sure they're green.
          systemStatus: function() {
            // for convenience
            function getIdx(plugin) { return getStatus(plugin).idx; }

            return function() {
              var currentStatus = 'loading';
              var currentIdx = getIdx(currentStatus);

              // FIXME eh, not too thrilled about this.
              var status = _.reduce($scope.ui.plugins, function(curr, plugin, key) {
                  var pluginIdx = getIdx(plugin);
                  if (pluginIdx > currentIdx) {
                    // set the current status
                    currentStatus = plugin.state;
                    currentIdx = getIdx(plugin);
                  }
                  return currentStatus;
                }, 'loading');

              // give the ui the label for colors and such
              return getStatus(status);
            }
          }(),
          charts: [],
          plugins: [],
          chartAverages: [],
          chartOptions: {
            getX: function(d) { return d[0]; },
            getY: function(d) {
              if(d) {
                if(_.isArray(d[1])) {
                  return d[1][0];
                }
              }
              return d[1];
            },
            formatX: function(d) {
              return moment(d).format('hh:mm:ss');
            },
            formatY: function(d) {
              // TODO
              // switch between different metric value types
            }
          },
          nvd3Config: {
          }
        };

        function getAppStatus() {
          // go ahead and get the info you want
          $http
            .get('/status/health')
            .success(function(data) {
              // Assign the propper variables to the scope and change them as necessary

              // setup The charts
              // wrap the metrics data and append the average
              $scope.ui.charts = _.mapValues(data.metrics, function(metric, name) {
                var sum = metric.reduce(function(prev, vector) {
                  return prev + $scope.ui.chartOptions.getY(vector);
                }, 0);

                var average = formatNumber(sum / metric.length, numberType(name))

                // Split out the metrics for the load between the 5, 10 and 15 marks
                if(_.isArray(metric[0][1])) {
                  var splitMetrics = [];
                  // Go through each value for the Y and create a place to put the data
                  // so it can be charted properly.
                  metric[0][1].forEach(function(name, idx) {
                    splitMetrics.push({key: idx, values: []});
                  });
                  // Go through all of the metric values and split the values out.
                  metric.forEach(function(metricVector) {
                    metricVector[1].forEach(function(value, idx) {
                      splitMetrics[idx].values.push([metricVector[0], value]);
                    });
                  });


                  metric = splitMetrics;
                }

                return { data: metric, average: average, niceName: niceName(name) };
              });

              // give the plugins their proper name so CSS classes can be properply applied
              $scope.ui.plugins = _.mapValues(data.status, function(plugin) {
                plugin.uiStatus = getLabel(plugin);
                return plugin;
              });


              // go ahead and get another status in 5 seconds
              setTimeout(getAppStatus, 5000);
            })
            .error(function() {
              alert('Something went terribly wrong while making the request!!!');
            });
        }


        // Start it all up
        getAppStatus();
      }]);

    return {
      init: function() {
        $(function() {
          angular.bootstrap(document, ['nvd3ChartDirectives', 'KibanaStatusApp']);
        });
      }
    };

  });
