import { badRequest } from 'boom';

export default function (kbnServer, server, config) {
  const disabled = config.get('server.xsrf.disableProtection');
  const versionHeader = 'kbn-version';
  const xsrfHeader = 'kbn-xsrf';
  const contentTypeHeader = 'content-type';
  const allowedRequestMediaTypes = ['application/json', 'application/x-ndjson'];

  server.ext('onPostAuth', function (req, reply) {
    if (disabled) {
      return reply.continue();
    }

    const isSafeMethod = req.method === 'get' || req.method === 'head';
    if (isSafeMethod) {
      // There is no need to verify XSRF for GET or HEAD requests.
      return reply.continue();
    }

    const hasVersionHeader = versionHeader in req.headers;
    const hasXsrfHeader = xsrfHeader in req.headers;
    const hasContentTypeHeader = contentTypeHeader in req.headers;

    // Since we're only interested in media type let's extract it from the content type ("media type [;parameter]")
    // and leave off parameter portion (e.g. charset) of the header.
    const hasAllowedMediaType = hasContentTypeHeader && allowedRequestMediaTypes.includes(
      req.headers[contentTypeHeader].split(';')[0]
    );

    if (hasXsrfHeader) {
      let xsrfHeaderDeprecationMessage =
        `The ${xsrfHeader} header is deprecated and will be removed in a future version of Kibana.`;
      if (!hasAllowedMediaType) {
        xsrfHeaderDeprecationMessage +=
          ` Specify a ${contentTypeHeader} header of either application/json or application/x-ndjson instead.`;
      }

      server.log(['warning', 'deprecation'], xsrfHeaderDeprecationMessage);
    } else if (!hasAllowedMediaType && hasVersionHeader) {
      server.log(
        ['warning', 'deprecation'],
        `The ${versionHeader} header will no longer be accepted for CSRF protection in a future version of Kibana.` +
        ` Specify a ${contentTypeHeader} header of either application/json or application/x-ndjson instead.`
      );
    }

    if (!hasAllowedMediaType && !hasVersionHeader && !hasXsrfHeader) {
      return reply(badRequest(
        `Request must contain a ${contentTypeHeader} header of either application/json or application/x-ndjson.` +
        ` The ${contentTypeHeader} header for current request is ${req.headers[contentTypeHeader]}.`
      ));
    }

    return reply.continue();
  });
}
