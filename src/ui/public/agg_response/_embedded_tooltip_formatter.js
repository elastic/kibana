import _ from 'lodash';
import $ from 'jquery';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

export function EmbeddedTooltipFormatterProvider($rootScope, $compile, Private, getAppState, savedVisualizations) {
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const tooltipTemplate = require('ui/agg_response/_embedded_tooltip.html');
  const UI_STATE_ID = 'popupVis';

  function getHandler(from, name) {
    if (typeof name === 'function') return name;
    return from.find(handler => handler.name === name).handler;
  }

  return function (parentVis) {
    let tooltipMsg = 'Initializing Tooltip...';
    const $tooltipScope = $rootScope.$new();
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const appState = getAppState();
    let searchSource;
    let $visEl;
    let requestHandler;
    let responseHandler;
    let fetchTimestamp;
    savedVisualizations.get(parentVis.params.tooltip.vis).then((savedObject) => {
      searchSource = savedObject.searchSource;
      requestHandler = getHandler(requestHandlers, savedObject.vis.type.requestHandler);
      responseHandler = getHandler(responseHandlers, savedObject.vis.type.responseHandler);
      const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      const parentUiState = getAppState().makeStateful('uiState');
      $tooltipScope.uiState = parentUiState.createChild(UI_STATE_ID, uiState, true);
      savedObject.vis.params.addTooltip = false; // disable tooltips for embedded visualization
      $tooltipScope.vis = savedObject.vis;
      $tooltipScope.visData = null;
      $visEl = $compile(tooltipTemplate)($tooltipScope);
    }, e => {
      tooltipMsg = _.get(e, 'message', 'Error initializing tooltip');
    });

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
            aggFilters.push(aggResult.aggConfig.createFilter(aggResult.key));
          }
          aggResult = aggResult.$parent;
        }

        searchSource.set('filter', aggFilters);
        requestHandler($tooltipScope.vis, appState, $tooltipScope.uiState, queryFilter, searchSource)
        .then(requestHandlerResponse => {
          return responseHandler($tooltipScope.vis, requestHandlerResponse);
        })
        .then(resp => {
          const $popup = $(`#${executionId}`);
          // Only update popup contents if results are for calling fetch
          if (localFetchTimestamp === fetchTimestamp && $popup && $popup.length > 0) {
            $visEl.css({
              width: parentVis.params.tooltip.width,
              height: parentVis.params.tooltip.height
            });
            $popup.css({
              width: parentVis.params.tooltip.width,
              height: parentVis.params.tooltip.height
            });
            $popup.empty();
            $popup.append($visEl);
            $tooltipScope.visData = resp;
            $tooltipScope.$apply();
          }
        });
      }

      return `<div
        id="${executionId}"
        class="tab-dashboard theme-dark"
        style="height: ${parentVis.params.tooltip.height}px; width: ${parentVis.params.tooltip.width}px;">
          ${tooltipMsg}
      </div>`;
    };
    formatter.destroy = () => {
      $tooltipScope.$destroy();
      if ($visEl) {
        $visEl.remove();
      }
    };
    return formatter;

  };

}
