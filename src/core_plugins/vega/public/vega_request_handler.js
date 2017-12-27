import { VegaParser } from './vega_view/vega_parser';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

export function VegaRequestHandlerProvider(Private, es, timefilter, serviceSettings) {

  const dashboardContext = Private(dashboardContextProvider);

  return {

    name: 'vega',

    handler(vis) {
      const vp = new VegaParser(vis.params.spec, es, timefilter, dashboardContext, serviceSettings);
      return vp.parseAsync();
    }

  };
}
