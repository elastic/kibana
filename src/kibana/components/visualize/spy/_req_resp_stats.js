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

      var req = $scope.entry = _.last(_.deepGet($scope, 'searchSource.history'));
      if (!req) return;

      var resp = req.resp;
      var meta = [];

      if (resp && resp.took != null) meta.push(['Query Duration', resp.took + 'ms']);
      if (req && req.ms != null) meta.push(['Request Duration', req.ms + 'ms']);
      if (resp && resp.hits) meta.push(['Hits', resp.hits.total]);

      if (req.fetchParams.index) meta.push(['Index', req.fetchParams.index]);
      if (req.fetchParams.type) meta.push(['Type', req.fetchParams.type]);
      if (req.fetchParams.id) meta.push(['Id', req.fetchParams.id]);

      $scope.history = {
        meta: meta,
        req: req.fetchParams.body,
        resp: req.resp,
        complete: req.complete
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