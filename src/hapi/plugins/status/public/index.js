define(['angular', 'jquery', 'lodash', 'nvd3', 'nvd3_directives'],
  function (angular, $, _, nvd3, directives) {

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


    // The Kibana App
    angular.module('KibanaStatusApp', ['nvd3ChartDirectives'])
      .controller('StatusPage', ['$scope', '$http', function($scope, $http) {
        // the object representing all of the elements the ui touches
        $scope.ui = {
          systemStatus: function() {
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
          nvd3Config: {
            getX: function(d) { return d[0]; },
            getY: function(d) {
              if(d) {
                if(_.isArray(d[1])) {
                  return d[1][0];
                }
              } else {
                debugger;
              }
              return d[1];
            }
          }
        };


        // go ahead and get the info you want
        $http
          .get('/status/health')
          .success(function(data) {
            // Assign the propper variables to the scope and change them as necessary

            // setup The charts
            // wrap the metrics data and append the average
            $scope.ui.charts = _.mapValues(data.metrics, function(metric) {
              var sum = metric.reduce(function(prev, vector) {
                return prev + $scope.ui.nvd3Config.getY(vector);
              }, 0);
              return { data: metric, average: sum / metric.length };
            });

            // give the plugins their proper name so CSS classes can be properply applied
            $scope.ui.plugins = _.mapValues(data.status, function(plugin) {
              plugin.uiStatus = getLabel(plugin);
              return plugin;
            });
          })
          .error(function() {
            alert('Something went terribly wrong while making the request!!!');
          });
      }]);

    return {
      init: function() {
        $(function() {
          angular.bootstrap(document, ['nvd3ChartDirectives', 'KibanaStatusApp']);
        });
      }
    };

  });
