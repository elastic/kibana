define(function (require) {
  return function VisSpyReqRespStats() {
    var _ = require('lodash');
    var reqRespStatsHTML = require('text!components/visualize/spy/_req_resp_stats.html');

    var linkReqRespStats = function ($scope, config) {
      $scope.$watch('searchSource.history.length', function () {
        // force the entry to be collected again
        $scope.entry = null;
      });

      $scope.$watchMulti([
        'entry',
        'searchSource',
        'entry.complete'
      ], function () {
        $scope.entry = null;

        if (!$scope.searchSource) return;

        var searchHistory = $scope.searchSource.history;
        if (!searchHistory) return;

        var entry = $scope.entry = _.find(searchHistory, 'state');
        if (!entry) return;

        var state = entry.state;
        var resp = entry.resp;
        var meta = [];

        if (resp && resp.took != null) meta.push(['Query Duration', resp.took + 'ms']);
        if (entry && entry.ms != null) meta.push(['Request Duration', entry.ms + 'ms']);
        if (resp && resp.hits) meta.push(['Hits', resp.hits.total]);

        if (state.index) meta.push(['Index', state.index]);
        if (state.type) meta.push(['Type', state.type]);
        if (state.id) meta.push(['Id', state.id]);

        $scope.history = {
          meta: meta,
          req: state.body,
          resp: entry.resp,
          complete: entry.complete
        };
      });
    };

    return [
      {
        name: 'request',
        display: 'Request',
        template: reqRespStatsHTML,
        link: linkReqRespStats
      },
      {
        name: 'response',
        display: 'Response',
        template: reqRespStatsHTML,
        link: linkReqRespStats
      },
      {
        name: 'stats',
        display: 'Statistics',
        template: reqRespStatsHTML,
        link: linkReqRespStats
      }
    ];
  };
});