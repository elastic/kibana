
import { map } from 'rxjs/operators';
import { ISearchStrategy, PluginStart } from '../../data/server';
import { IMyStrategyRequest, IMyStrategyResponse } from '../common/types';

export const mySearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<IMyStrategyRequest, IMyStrategyResponse> => {
  const preprocessRequest = (request: IMyStrategyRequest) => {
    // Custom preprocessing
  };

  const formatResponse = (response: IMyStrategyResponse) => {
    // Custom post-processing
  };

  const es = data.search.getSearchStrategy();
  return {
    search: (request, options, deps) => {
      return formatResponse(es.search(preprocessRequest(request), options, deps));
    },
  };
};
