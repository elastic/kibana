import { insecureAuthRoute } from './insecure_auth_route';

// TODO: Fix this first. This route returns decrypts the cookie and returns the basic auth header. It is used because
// the pre-route hapi hook doesn't work on the socket and there are no exposed methods for doing the conversion from cookie
// to auth header. We will need to add that to x-pack security
// In theory this is pretty difficult to exploit, but not impossible.
//
export function getAuth(server) {
  server.route({
    method: 'GET',
    path: insecureAuthRoute,
    handler: function(request, reply) {
      reply(request.headers.authorization);
    },
  });
}
