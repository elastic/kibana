const SYSTEM_API_HEADER_NAME = 'kbn-system-api';

/**
 * Checks on the *server-side*, if an HTTP request is a system API request
 *
 * @param request HAPI request object
 * @return        true if request is a system API request; false, otherwise
 */
export function isSystemApiRequest(request) {
  return !!request.headers[SYSTEM_API_HEADER_NAME];
}
