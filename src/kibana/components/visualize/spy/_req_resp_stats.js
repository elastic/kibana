define(function (require) {

  var _ = require('lodash');
  var reqRespStatsHTML = require('text!components/visualize/spy/_req_resp_stats.html');
  require('components/clipboard/clipboard');

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

  require('registry/spy_modes')
  .register(function () {
    return {
      name: 'request',
      display: 'Request',
      order: 2,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  })
  .register(function () {
    return {
      name: 'response',
      display: 'Response',
      order: 3,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  })
  .register(function () {
    return {
      name: 'stats',
      display: 'Statistics',
      order: 4,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  });
});