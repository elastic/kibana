import { requestFetchParamsToBody } from './request_fetch_params_to_body';

export function RequestFetchParamsToBodyProvider($rootScope, Promise, timefilter, kbnIndex, sessionId) {
  return (requestsFetchParams) => (
    requestFetchParamsToBody(
      $rootScope,
      requestsFetchParams,
      Promise,
      timefilter,
      kbnIndex,
      sessionId)
  );
}
