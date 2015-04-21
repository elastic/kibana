define(['angular', 'jquery', 'lodash', 'nvd3', 'nvd3_directives'],
  function (angular, $, _, nvd3, directives) {

    // Make sure we don't have to deal with statuses by hand
    function getStatus(plugin) {
        var statusMap = {
          green: {
            label: 'success',
            msg: 'All systems are a Go.',
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
            // Assign the propper variables to the scope
            $scope.ui.charts = data.metrics;
            $scope.ui.plugins = _.mapValues(data.status, function(plugin) {
              plugin.uiStatus = getLabel(plugin);
              return plugin;
            });

            console.log($scope.ui);
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
