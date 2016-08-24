import querystring from 'querystring';
import { resolve } from 'url';
import filterHeaders from './filter_headers';
import setHeaders from './set_headers';

export default function mapUri(server, prefix) {

  const config = server.config();
  return function (request, done) {
    const path = request.path.replace('/elasticsearch', '');
    let url = config.get('elasticsearch.url');
    if (path) {
      if (/\/$/.test(url)) url = url.substring(0, url.length - 1);
      url += path;
    }
    const query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    const filteredHeaders = filterHeaders(request.headers, config.get('elasticsearch.requestHeadersWhitelist'));
    const customHeaders = setHeaders(filteredHeaders, config.get('elasticsearch.customHeaders'));
    done(null, url, customHeaders);
  };
};
