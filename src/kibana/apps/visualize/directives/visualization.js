define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  function VisualizationDirective(createNotifier) {
    return {
      restrict: 'E',
      template: '<div class="chart"></div>',
      scope: {
        vis: '='
      },
      link: function ($scope, $el) {
        var vis = $scope.vis;
        var notify = createNotifier({
          location: vis.type + ' visualization'
        });

        function renderData(data, $el) {
          var splitBy, splits, inherit;

          if (data.rows) {
            splits = data.rows;
            splitBy = 'height';
            inherit = 'width';
          }
          else if (data.columns) {
            splits = data.columns;
            splitBy = 'width';
            inherit = 'height';
          }

          if (splitBy && splits && inherit) {
            var splitSize = $el[splitBy]() / splits.length;
            var charts = splits.map(function (splitData) {
              // create the element that will contain this splits data
              var $splitEl = $(document.createElement('div'));

              // set the height and width
              $splitEl[splitBy](splitSize);
              $splitEl[inherit]('100%');

              // append it to the parent
              $el.append($splitEl);

              // render the splits data into the new $el
              return renderData(splitData, $splitEl);
            });
            return charts;
          }
          else {
            // we can ignore splits completely now
            var chart = new k4d3.Chart($el.get(0), {
              type: 'histogram'
            });
            chart.render(data);
            return chart;
          }
        }

        vis.dataSource.onResults().then(function onResults(resp) {
          notify.event('render visualization');
          $el.html('');
          renderData(vis.buildChartDataFromResponse(resp), $el);
          notify.event('render visualization', true);

          return vis.dataSource.onResults(onResults);
        }).catch(notify.fatal);
      }
    };
  }

  require('modules').get('kibana/directive')
    .directive('visualization', VisualizationDirective);
});