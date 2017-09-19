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
    const $tooltipScope = $rootScope.$new();
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const appState = getAppState();
    let popVis;
    let $visEl;
    let requestHandler;
    let responseHandler;
    savedVisualizations.get('c3778850-8ccb-11e7-9508-3f73ba707926').then((savedObject) => {
      popVis = savedObject;
      requestHandler = getHandler(requestHandlers, savedObject.vis.type.requestHandler);
      responseHandler = getHandler(responseHandlers, savedObject.vis.type.responseHandler);
      const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      const parentUiState = getAppState().makeStateful('uiState');
      $tooltipScope.uiState = parentUiState.createChild(UI_STATE_ID, uiState, true);
      $tooltipScope.vis = savedObject.vis;
      $tooltipScope.visData = null;
      $visEl = $compile(tooltipTemplate)($tooltipScope);
    });

    let previousResp;

    return function (event) {
      const datum = event.datum;

      requestHandler($tooltipScope.vis, appState, $tooltipScope.uiState, queryFilter, popVis.searchSource)
      .then(requestHandlerResponse => {
        return responseHandler($tooltipScope.vis, requestHandlerResponse);
      }, e => {
        // TODO display error message in popup text
        console.log(e);
      })
      .then(resp => {
        $visEl.css({
          width: 300,
          height: 500
        });
        const $popup = $('#embeddedTooltip');
        $popup.empty();
        $popup.append($visEl);
        $tooltipScope.visData = resp;
        $tooltipScope.$apply();
      }, e => {
        // TODO display error message in popup text
        console.log(e);
      });

      return '<div id="embeddedTooltip" style="height: 300px; width: 500px;">Loading Visualization Data</div>';
    };

  };

}
