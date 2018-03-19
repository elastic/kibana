/**
 * Return the raw ES-response.
 * The  vis-framework does any conversion to the ES-response up-front.
 * It performs this conversion even when it shouldn't. E.g. if no new query was run.
 * Furthermore, the artificial split between responseHandler and responseConverter basically introduces two conversions.
 * These can be all rolled-up into one.
 * By delaying reading out the values until absolutely required, we can much more efficiently read out the required values.
 * This should alleviate crufty conversion of
 * @param vis
 * @param esResponse
 * @param respOpts
 * @return {*}
 */
export function identityResponseHandler(vis, esResponse) {
  return esResponse;
}
