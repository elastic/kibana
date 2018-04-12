/**
 * Return the raw ES-response.
 * By delaying conversion of the values until absolutely required, we can much more efficiently handle data.
 * It avoids being passed through the responseHandler/responseConverter change on every update.
 * @param vis
 * @param esResponse
 * @return {*}
 */
export function identityResponseHandler(vis, esResponse) {
  return esResponse;
}
