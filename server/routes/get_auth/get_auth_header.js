import { insecureAuthRoute } from './insecure_auth_route';

// TODO: OMG. No. Need a better way of setting to this than our wacky route thing.
export function getAuthHeader(request, server) {
  return server.inject({
    method: 'GET',
    url: insecureAuthRoute,
    headers: request.headers,
  }).then(res => res.result);
}
