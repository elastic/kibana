define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var moment = require('moment');
  var numeral = require('numeral');
  require('nvd3_directives');

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
    if (!_.isObject(plugin) || _.isUndefined(plugin)) {
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
      .map(function (word) { return word[0].toUpperCase() + _.rest(word).join(''); })
      .join(' ');
  }

  function formatNumber(num, which) {
    var format = '0.00';
    var postfix = '';
    switch (which) {
      case 'time':
        return moment(num).format('HH:mm:ss');
      case 'byte':
        format += 'b';
        break;
      case 'ms':
        postfix = 'ms';
        break;
    }
    return numeral(num).format(format) + postfix;
  }

  function numberType(key) {
    var byteMetrics = ['heapTotal', 'heapUsed', 'rss'];
    var msMetrics = ['delay', 'responseTimeAvg', 'responseTimeMax'];
    var preciseMetric = ['requests', 'load'];
    if ( byteMetrics.indexOf(key) > -1 ) {
      return 'byte';
    } else if (msMetrics.indexOf(key) > -1 ) {
      return 'ms';
    } else {
      return 'precise';
    }
  }

  var makeChartOptions = _.memoize(function (type) {
    return {
      chart: {
        type: 'lineChart',
        height: 200,
        showLegend: false,
        showXAxis: false,
        showYAxis: false,
        useInteractiveGuideline: true,
        tooltips: true,
        pointSize: 0,
        color: ['#444', '#777', '#aaa'],
        margin: {
          top: 10,
          left: 0,
          right: 0,
          bottom: 20
        },
        xAxis: { tickFormat: function (d) { return formatNumber(d, 'time'); } },
        yAxis: { tickFormat: function (d) { return formatNumber(d, type); }, },
        y: function (d) { return d.y; },
        x: function (d) { return d.x; }
      }
    };
  });

  // The Kibana App
  require('modules')
  .get('KibanaStatusApp', ['nvd3'])
  .controller('StatusPage', function ($scope, $http, $window, $timeout) {
    // the object representing all of the elements the ui touches
    $scope.ui = {
      // show the system status by going through all of the plugins,
      // and making sure they're green.
      systemStatus: (function () {
        // for convenience
        function getIdx(plugin) { return getStatus(plugin).idx; }

        return function () {
          var currentStatus = 'loading';
          var currentIdx = getIdx(currentStatus);

          // FIXME eh, not too thrilled about this.
          var status = _.reduce($scope.ui.plugins, function (curr, plugin, key) {
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
        };
      }()),
      charts: {},
      plugins: []
    };

    var windowHasFocus = true;
    angular.element($window).bind({
      blur: function () { windowHasFocus = false; },
      focus: function () {
        windowHasFocus = true;
        getAppStatus();
      }
    });

    function getAppStatus() {
      // go ahead and get the info you want
      $http
      .get('/status/health')
      .success(function (data) {
        // Assign the propper variables to the scope and change them as necessary

        // setup The charts
        // wrap the metrics data and append the average
        $scope.ui.charts = _.mapValues(data.metrics, function (metric, name) {

          // Metric Values format
          // metric: [[xValue, yValue], ...]
          // LoadMetric:
          // metric: [[xValue, [yValue, yValue2, yValue3]], ...]
          // return [
          //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue}, ...]},
          //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue1}, ...]},
          //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue2}, ...]}]
          //
          // Go through all of the metric values and split the values out.
          // returns an array of all of the averages
          var metricList = [];
          var metricNumberType = numberType(name);

          // convert the [x,y] into {x: x, y: y}
          metric.forEach(function (vector) {
            vector = _.flatten(vector);
            var x = vector.shift();
            vector.forEach(function (yValue, idx) {
              if (!metricList[idx]) {
                metricList[idx] = {
                  key: name + idx,
                  values: []
                };
              }
              // unshift to make sure they're in the correct order
              metricList[idx].values.unshift({x: x, y: yValue});
            });
          });

          var average = metricList.map(function (data) {
            var uglySum = data.values.reduce(function (sumSoFar, vector) {
              return sumSoFar + vector.y;
            }, 0);
            return formatNumber(uglySum / data.values.length, metricNumberType);
          });
          var options = makeChartOptions(metricNumberType);

          return { data: metricList, average: average, niceName: niceName(name), options: options };
        });

        // give the plugins their proper name so CSS classes can be properply applied
        $scope.ui.plugins = _.mapValues(data.status, function (plugin) {
          plugin.uiStatus = getLabel(plugin);
          return plugin;
        });

        if (windowHasFocus) {
          // go ahead and get another status in 5 seconds
          $timeout(getAppStatus, 5000);
        }
      })
      .error(function () {
        window.alert('Something went terribly wrong while making the request!!! Perhaps your server is down?');
      });
    }

    // Start it all up
    getAppStatus();
  });

  return {
    init: function () {
      $(function () {
        angular.bootstrap(window.document, ['nvd3', 'KibanaStatusApp']);
      });
    }
  };

});
