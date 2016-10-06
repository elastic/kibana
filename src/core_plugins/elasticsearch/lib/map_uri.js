import { defaults, omit, trimLeft, trimRight } from 'lodash';
import { parse as parseUrl, format as formatUrl, resolve } from 'url';
import filterHeaders from './filter_headers';
import setHeaders from './set_headers';

export default function mapUri(server, prefix) {
  const config = server.config();

  function joinPaths(pathA, pathB) {
    return trimRight(pathA, '/') + '/' + trimLeft(pathB, '/');
  }

  return function (request, done) {
    const {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort,
      pathname: esUrlBasePath,
      query: esUrlQuery
    } = parseUrl(config.get('elasticsearch.url'), true);

    // copy most url components directly from the elasticsearch.url
    const mappedUrlComponents = {
      protocol: esUrlProtocol,
      slashes: esUrlHasSlashes,
      auth: esUrlAuth,
      hostname: esUrlHostname,
      port: esUrlPort
    };

    // pathname
    const reqSubPath = request.path.replace('/elasticsearch', '');
    mappedUrlComponents.pathname = joinPaths(esUrlBasePath, reqSubPath);

    // querystring
    const mappedQuery = defaults(omit(request.query, '_'), esUrlQuery || {});
    if (Object.keys(mappedQuery).length) {
      mappedUrlComponents.query = mappedQuery;
    }

    const filteredHeaders = filterHeaders(request.headers, config.get('elasticsearch.requestHeadersWhitelist'));
    const mappedHeaders = setHeaders(filteredHeaders, config.get('elasticsearch.customHeaders'));
    const mappedUrl = formatUrl(mappedUrlComponents);
    done(null, mappedUrl, mappedHeaders);
  };
};
