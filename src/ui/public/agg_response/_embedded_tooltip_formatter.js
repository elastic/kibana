import _ from 'lodash';
import $ from 'jquery';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { PersistedState } from 'ui/persisted_state';

export function EmbeddedTooltipFormatterProvider($rootScope, $compile, Private, getAppState, savedVisualizations) {
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const tooltipTemplate = require('ui/agg_response/_embedded_tooltip.html');

  function getHandler(from, name) {
    if (typeof name === 'function') return name;
    return from.find(handler => handler.name === name).handler;
  }

  return function (parentVis) {
    let tooltipMsg = 'Initializing Tooltip...';
    let $tooltipScope;
    let $visEl;
    let setTimeRange;
    let initEmbedded;
    const destroyEmbedded = () => {
      if ($tooltipScope) {
        $tooltipScope.$destroy();
      }
      if ($visEl) {
        $visEl.remove();
      }
    };
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const appState = getAppState();
    let vis;
    let searchSource;
    let requestHandler;
    let responseHandler;
    let uiState;
    let fetchTimestamp;
    savedVisualizations.get(parentVis.params.tooltip.vis).then((savedObject) => {
      vis = savedObject.vis;
      vis.params.addTooltip = false; // disable tooltips for embedded visualization
      searchSource = savedObject.searchSource;
      requestHandler = getHandler(requestHandlers, savedObject.vis.type.requestHandler);
      responseHandler = getHandler(responseHandlers, savedObject.vis.type.responseHandler);
      uiState = new PersistedState(savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {});
      setTimeRange = (timeRange) => {
        savedObject.vis.aggs.forEach(agg => {
          if (agg.type.name !== 'date_histogram') return;
          agg.setTimeRange({
            min: new Date(timeRange.min),
            max: new Date(timeRange.max)
          });
        });
      };
      initEmbedded = () => {
        destroyEmbedded();
        $tooltipScope = $rootScope.$new();
        $tooltipScope.uiState = uiState;
        $tooltipScope.vis = savedObject.vis;
        $tooltipScope.visData = null;
        $visEl = $compile(tooltipTemplate)($tooltipScope);
      };
    }, e => {
      tooltipMsg = _.get(e, 'message', 'Error initializing tooltip');
    });

    function getWidth() {
      return window.innerWidth * 0.4;
    }
    function getHeight() {
      return window.innerHeight * 0.4;
    }

    const formatter = function (event) {
      const executionId = `embedded-${Date.now()}`;

      if (requestHandler && responseHandler) {
        tooltipMsg = 'Loading Data...';

        const localFetchTimestamp = Date.now();
        fetchTimestamp = localFetchTimestamp;

        const aggFilters = [];
        let aggResult = event.datum.aggConfigResult;
        while(aggResult) {
          if (aggResult.type === 'bucket') {
            const filter = aggResult.aggConfig.createFilter(aggResult.key);
            aggFilters.push(filter);
            if (aggResult.aggConfig.getField().type === 'date') {
              setTimeRange({
                min: filter.range[aggResult.aggConfig.getField().name].gte,
                max: filter.range[aggResult.aggConfig.getField().name].lt
              });
            }
          }
          aggResult = aggResult.$parent;
        }

        searchSource.set('filter', aggFilters);
        requestHandler(vis, appState, uiState, queryFilter, searchSource)
        .then(requestHandlerResponse => {
          return responseHandler(vis, requestHandlerResponse);
        })
        .then(resp => {
          const $popup = $(`#${executionId}`);
          // Only update popup contents if results are for calling fetch
          if (localFetchTimestamp === fetchTimestamp && $popup && $popup.length > 0) {
            initEmbedded();
            $visEl.css({
              width: getWidth(),
              height: getHeight()
            });
            $popup.css({
              width: getWidth(),
              height: getHeight()
            });
            $popup.empty();
            $popup.append($visEl);
            $tooltipScope.visData = resp;
            $tooltipScope.$apply();
          }
        });
      }

      return `<div id="${executionId}" class="tab-dashboard theme-dark"
        style="height: ${getHeight()}px; width: ${getWidth()}px;">${tooltipMsg}</div>`;
    };
    formatter.cleanUp = () => {
      fetchTimestamp = 'expired';
      destroyEmbedded();
    };
    return formatter;

  };

}
