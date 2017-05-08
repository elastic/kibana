import { AbortableProvider } from './abortable';

export function CallClientProvider(Private, Promise, es) {
  const createAbortable = Private(AbortableProvider);

  return function callClient(strategy, requests) {
    let esPromise;

    const { promise, abort } = createAbortable([
      function () {
        return Promise.map(requests, function (req) {
          return Promise.resolve(req.getFetchParams(req)).then(fetchParams => {
            return (req.fetchParams = fetchParams);
          });
        });
      },
      function (reqsFetchParams) {
        return strategy.reqsFetchParamsToBody(reqsFetchParams);
      },
      function (body) {
        return (esPromise = es[strategy.clientMethod]({ body }));
      },
      function (clientResp) {
        return strategy.getResponses(clientResp);
      }
    ]);

    promise.abort = () => {
      abort();
      esPromise.abort();
    };

    return promise;
  };
}
