import { requestFetchParamsToBody } from './request_fetch_params_to_body';

export function RequestFetchParamsToBodyProvider(Promise, timefilter, kbnIndex, sessionId) {
  const timeBounds = timefilter.getActiveBounds();
  const indexToListMapping = {};
  return (requestsFetchParams) => (
    requestFetchParamsToBody(
      requestsFetchParams,
      indexToListMapping,
      Promise,
      timeBounds,
      kbnIndex,
      sessionId)
  );
}
