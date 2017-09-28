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
    let $tooltipScope;
    let $visEl;
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
      uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      const parentUiState = getAppState().makeStateful('uiState');
      initEmbedded = () => {
        destroyEmbedded();
        $tooltipScope = $rootScope.$new();
        $tooltipScope.uiState = parentUiState.createChild(UI_STATE_ID, uiState, true);
        $tooltipScope.vis = savedObject.vis;
        $tooltipScope.visData = null;
        $visEl = $compile(tooltipTemplate)($tooltipScope);
      };
    }, e => {
      tooltipMsg = _.get(e, 'message', 'Error initializing tooltip');
    });

    // Do not let dimensions exceed 40% of window dimensions
    function getWidth() {
      let width = parentVis.params.tooltip.width;
      const max = Math.floor(window.innerWidth * 0.4);
      if (width > max) {
        width = max;
      }
      return width;
    }
    function getHeight() {
      let height = parentVis.params.tooltip.height;
      const max = Math.floor(window.innerHeight * 0.4);
      if (height > max) {
        height = max;
      }
      return height;
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
            aggFilters.push(aggResult.aggConfig.createFilter(aggResult.key));
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
        style="height: ${getHeight()}px; width: ${getWidth()}px;">${tooltipMsg}></div>`;
    };
    formatter.cleanUp = () => {
      destroyEmbedded();
    };
    return formatter;

  };

}
