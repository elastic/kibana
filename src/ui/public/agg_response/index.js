import { BuildHierarchicalDataProvider } from 'ui/agg_response/hierarchical/build_hierarchical_data';
import { AggResponsePointSeriesProvider } from 'ui/agg_response/point_series/point_series';
import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import { AggResponseGeoJsonProvider } from 'ui/agg_response/geo_json/geo_json';

export function AggResponseIndexProvider(Private) {
  return {
    hierarchical: Private(BuildHierarchicalDataProvider),
    pointSeries: Private(AggResponsePointSeriesProvider),
    tabify: tabifyAggResponse,
    geoJson: Private(AggResponseGeoJsonProvider)
  };
}
