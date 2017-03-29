import Joi from 'joi';
import Boom from 'boom';
import Wreck from 'wreck';
import { trimLeft, trimRight } from 'lodash';

function resolveUri(base, path) {
  return `${trimRight(base, '/')}/${trimLeft(path, '/')}`;
}

function extendCommaList(obj, property, value) {
  obj[property] = (obj[property] ? obj[property] + ',' : '') + value;
}

function getProxyHeaders(req) {
  const headers = {};

  if (req.info.remotePort && req.info.remoteAddress) {
    // see https://git.io/vytQ7
    extendCommaList(headers, 'x-forwarded-for', req.info.remoteAddress);
    extendCommaList(headers, 'x-forwarded-port', req.info.remotePort);
    extendCommaList(headers, 'x-forwarded-proto', req.connection.info.protocol);
    extendCommaList(headers, 'x-forwarded-host', req.info.host);
  }

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['content-type'] = contentType;
  }

  return headers;
}

export const createProxyRoute = ({
  baseUrl = '/',
  pathFilters = [/.*/],
  getConfigForReq = () => ({}),
}) => ({
  path: '/api/console/proxy',
  method: 'POST',
  config: {
    payload: {
      output: 'stream',
      parse: false
    },

    validate: {
      query: Joi.object().keys({
        method: Joi.string()
          .valid('HEAD', 'GET', 'POST', 'PUT', 'DELETE')
          .insensitive()
          .required(),
        path: Joi.string().required()
      }).unknown(true),
    },

    pre: [
      function filterPath(req, reply) {
        const { path } = req.query;

        if (!pathFilters.some(re => re.test(path))) {
          const err = Boom.forbidden();
          err.output.payload = `Error connecting to '${path}':\n\nUnable to send requests to that path.`;
          err.output.headers['content-type'] = 'text/plain';
          reply(err);
        } else {
          reply();
        }
      },
    ],

    handler(req, reply) {
      const { payload, query } = req;
      const { path, method } = query;
      const uri = resolveUri(baseUrl, path);

      const {
        timeout,
        rejectUnauthorized,
        agent,
        headers,
      } = getConfigForReq(req, uri);

      const wreckOptions = {
        payload,
        timeout,
        rejectUnauthorized,
        agent,
        headers: {
          ...headers,
          ...getProxyHeaders(req)
        },
      };

      Wreck.request(method, uri, wreckOptions, (err, esResponse) => {
        if (err) {
          return reply(err);
        }

        if (method.toUpperCase() !== 'HEAD') {
          reply(esResponse)
            .code(esResponse.statusCode)
            .header('warning', esResponse.headers.warning);
          return;
        }

        reply(`${esResponse.statusCode} - ${esResponse.statusMessage}`)
          .code(esResponse.statusCode)
          .type('text/plain')
          .header('warning', esResponse.headers.warning);
      });
    }
  }
});
