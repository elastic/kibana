define(function (require) {
  return function VisSpyReqRespStats() {
    var reqRespStatsHTML = require('text!apps/visualize/spy/_req_resp_stats.html');
    var linkReqRespStats = function ($scope, config) {
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

          if (resp && resp.took != null) meta.push(['Query Duration', resp.took + 'ms']);
          if (entry && entry.ms != null) meta.push(['Request Duration', entry.ms + 'ms']);
          if (resp && resp.hits) meta.push(['Hits', resp.hits.total]);

          if (state.index) meta.push(['Index', state.index]);
          if (state.type) meta.push(['Type', state.type]);
          if (state.id) meta.push(['Id', state.id]);

          return {
            meta: meta,
            req: state.body,
            resp: entry.resp
          };
        }).filter(Boolean);
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