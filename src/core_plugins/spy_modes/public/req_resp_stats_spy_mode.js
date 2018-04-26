import reqRespStatsHTML from './req_resp_stats_spy_mode.html';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';

const linkReqRespStats = function (mode, $scope) {
  $scope.mode = mode;
  $scope.$bind('req', 'searchSource.history[searchSource.history.length - 1]');
  $scope.$watchMulti([
    'req',
    'req.started',
    'req.stopped',
    'searchSource'
  ], function () {
    if (!$scope.searchSource || !$scope.req) return;

    const req = $scope.req;
    const resp = $scope.req.resp;
    const stats = $scope.stats = [];

    if (resp && resp.took != null) stats.push(['Query Duration', resp.took + 'ms']);
    if (req && req.ms != null) stats.push(['Request Duration', req.ms + 'ms']);
    if (resp && resp.hits) stats.push(['Hits', resp.hits.total]);

    if (req.fetchParams && req.fetchParams.index) {
      if (req.fetchParams.index.title) stats.push(['Index', req.fetchParams.index.title]);
      if (req.fetchParams.index.type) stats.push(['Type', req.fetchParams.index.type]);
      if (req.fetchParams.index.id) stats.push(['Id', req.fetchParams.index.id]);
    }
  });
};

function shouldShowSpyMode(vis) {
  return vis.type.requestHandler === 'courier' && vis.type.requiresSearch;
}

SpyModesRegistryProvider
  .register(function () {
    return {
      name: 'request',
      display: 'Request',
      order: 2,
      template: reqRespStatsHTML,
      showMode: shouldShowSpyMode,
      link: linkReqRespStats.bind(null, 'request')
    };
  })
  .register(function () {
    return {
      name: 'response',
      display: 'Response',
      order: 3,
      template: reqRespStatsHTML,
      showMode: shouldShowSpyMode,
      link: linkReqRespStats.bind(null, 'response')
    };
  })
  .register(function () {
    return {
      name: 'stats',
      display: 'Statistics',
      order: 4,
      template: reqRespStatsHTML,
      showMode: shouldShowSpyMode,
      link: linkReqRespStats.bind(null, 'stats')
    };
  });
