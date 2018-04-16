import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';

export function makeTabbedResponseHandler() {

  let lastEsResponse;
  let lastTabifiedResponse;

  return function makeIdentityResponseHandler(vis, esResponse) {

    if (lastEsResponse === esResponse) {
      return lastTabifiedResponse;
    }
    lastTabifiedResponse = tabifyAggResponse(vis.getAggConfig().getResponseAggs(), esResponse, {
      asAggConfigResults: false
    });
    lastEsResponse = esResponse;
    return lastTabifiedResponse;
  };
}
