import { VegaParser } from './vega_view/vega_parser';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { SearchCache } from './search_cache';

export function VegaRequestHandlerProvider(Private, es, timefilter, serviceSettings) {

  const dashboardContext = Private(dashboardContextProvider);
  const searchCache = new SearchCache(es, { max: 10, maxAge: 4 * 1000 });

  return {

    name: 'vega',

    handler(vis) {
      const vp = new VegaParser(vis.params.spec, searchCache, timefilter, dashboardContext, serviceSettings);
      return vp.parseAsync();
    }

  };
}
