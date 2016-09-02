import { badRequest } from 'boom';

export default function (kbnServer, server, config) {
  const versionHeader = 'kbn-version';
  const actualVersion = config.get('pkg.version');

  server.ext('onPostAuth', function (req, reply) {
    const versionRequested = req.headers[versionHeader];

    if (versionRequested && versionRequested !== actualVersion) {
      return reply(badRequest('Browser client is out of date, please refresh the page', {
        expected: actualVersion,
        got: versionRequested
      }));
    }

    return reply.continue();
  });
}
