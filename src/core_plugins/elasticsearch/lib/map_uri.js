import { defaults, omit, trimLeft, trimRight } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import filterHeaders from './filter_headers';
import setHeaders from './set_headers';

export default function mapUri(server, esClient, proxyPrefix) {
  const config = server.config();
  const es = esClient.transport._config.host;

  function joinPaths(pathA, pathB) {
    return trimRight(pathA, '/') + '/' + trimLeft(pathB, '/');
  }

  return function (request, done) {
    const {
      query: esUrlQuery
    } = parseUrl(config.get('elasticsearch.url'), true);

    // copy most url components directly from the elasticsearch.url
    const mappedUrlComponents = {
      protocol: es.protocol,
      slashes: true, // QUESTION: would it every be anything else?
      auth: es.auth, // QUESTION: should we pass this on?
      hostname: es.host,
      port: es.port
    };

    // pathname
    const reqSubPath = request.path.replace(proxyPrefix, '');
    mappedUrlComponents.pathname = joinPaths(es.path, reqSubPath);

    // querystring
    const mappedQuery = defaults(omit(request.query, '_'), es.query || {});
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const filteredHeaders = filterHeaders(request.headers, config.get('elasticsearch.requestHeadersWhitelist'));
    const mappedHeaders = setHeaders(filteredHeaders, config.get('elasticsearch.customHeaders'));
    const mappedUrl = formatUrl(mappedUrlComponents);
    done(null, mappedUrl, mappedHeaders);
  };
};
