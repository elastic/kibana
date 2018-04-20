import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';

export function makeGeoJsonResponseHandler() {

  let lastEsResponse;
  let lastGeoJsonResponse;

  return function (vis, esResponse) {
    if (lastEsResponse === esResponse) {
      return lastGeoJsonResponse;
    }

    lastEsResponse = esResponse;

    //double conversion, first to table, then to geojson
    //This is to future-proof this code for Canvas-refactoring
    const tabifiedResponse = tabifyAggResponse(vis.getAggConfig().getResponseAggs(), esResponse, {
      asAggConfigResults: false
    });
    lastGeoJsonResponse = convertToGeoJson(tabifiedResponse);

    return lastGeoJsonResponse;
  };
}
