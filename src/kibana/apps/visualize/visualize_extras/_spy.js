define(function (require) {
  var module = require('modules').get('app/visualize');
  var _ = require('lodash');
  var saveAs = require('file_saver');

  return function VisualizeExtraSpy() {
    return function spyLinkFn ($scope, $el) {
      $scope.$watchCollection('vis.searchSource.history', function (searchHistory) {
        if (!searchHistory) {
          $scope.history = [];
          return;
        }

        $scope.history = searchHistory.map(function (entry) {
          if (!entry.complete || !entry.state) return;

          var state = entry.state;
          var resp = entry.resp;
          var meta = [];

          if (entry.moment) meta.push(['Time', entry.moment.fromNow()]);
          if (resp && resp.took != null) meta.push(['Took (ms)', resp.took]);

          if (state.index) meta.push(['Index', state.index]);
          if (state.type) meta.push(['Type', state.type]);
          if (state.id) meta.push(['Id', state.id]);

          return {
            meta: meta,
            req: JSON.stringify(state.body, null, '    '),
            resp: JSON.stringify(entry.resp, null, '    ')
          };
        }).filter(Boolean);

      });
    };
  };
});