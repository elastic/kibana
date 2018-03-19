import Boom from 'boom';

import { modifyUrl } from '../../utils';

export function setupBasePathRewrite(server, config) {
  const basePath = config.get('server.basePath');
  const rewriteBasePath = config.get('server.rewriteBasePath');

  if (!basePath || !rewriteBasePath) {
    return;
  }

  server.ext('onRequest', (request, reply) => {
    const newUrl = modifyUrl(request.url.href, parsed => {
      if (parsed.pathname.startsWith(basePath)) {
        parsed.pathname = parsed.pathname.replace(basePath, '') || '/';
      } else {
        return {};
      }
    });

    if (!newUrl) {
      reply(Boom.notFound());
      return;
    }

    request.setUrl(newUrl);
    reply.continue();
  });
}
