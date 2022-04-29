"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createHandler = void 0;

var url = _interopRequireWildcard(require("url"));

var _lodash = require("lodash");

// var _router = require("../../../../../../../core/server/http/router");

var _lib = require("../../../../lib");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// TODO: find a better way to get information from the request like remoteAddress and remotePort
// for forwarding.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
function toURL(base, path) {
  const [p, query = ''] = path.split('?'); // if there is a '+' sign in query e.g. ?q=create_date:[2020-05-10T08:00:00.000+08:00 TO *]
  // node url encodes it as a whitespace which results in a faulty request
  // we need to replace '+' with '%2b' to encode it correctly

  if (/\+/g.test(query)) {
    path = `${p}?${query.replace(/\+/g, '%2b')}`;
  }

  const urlResult = new url.URL(`${(0, _lodash.trimEnd)(base, '/')}/${(0, _lodash.trimStart)(path, '/')}`); // Appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)

  if (!urlResult.searchParams.get('pretty')) {
    urlResult.searchParams.append('pretty', 'true');
  }

  return urlResult;
}

function filterHeaders(originalHeaders, headersToKeep) {
  const normalizeHeader = function (header) {
    if (!header) {
      return '';
    }

    header = header.toString();
    return header.trim().toLowerCase();
  }; // Normalize list of headers we want to allow in upstream request


  const headersToKeepNormalized = headersToKeep.map(normalizeHeader);
  return (0, _lodash.pick)(originalHeaders, headersToKeepNormalized);
}

function getRequestConfig(headers, esConfig, uri, kibanaVersion, proxyConfigCollection) {
  const filteredHeaders = filterHeaders(headers, esConfig.requestHeadersWhitelist);
  const newHeaders = (0, _lib.setHeaders)(filteredHeaders, esConfig.customHeaders);

  if (kibanaVersion.major < 8) {
    // In 7.x we still support the proxyConfig setting defined in kibana.yml
    // From 8.x we don't support it anymore so we don't try to read it here.
    if (proxyConfigCollection.hasConfig()) {
      return { ...proxyConfigCollection.configForUri(uri),
        headers: newHeaders
      };
    }
  }

  return { ...(0, _lib.getElasticsearchProxyConfig)(esConfig),
    headers: newHeaders
  };
}

function getProxyHeaders(req) {
  var _req$info, _req$info2;

  const headers = Object.create(null); // Scope this proto-unsafe functionality to where it is being used.

  function extendCommaList(obj, property, value) {
    obj[property] = (obj[property] ? obj[property] + ',' : '') + value;
  }

  // const _req = (0, _router.ensureRawRequest)(req);
  const _req = req;

  if (_req !== null && _req !== void 0 && (_req$info = _req.info) !== null && _req$info !== void 0 && _req$info.remotePort && _req !== null && _req !== void 0 && (_req$info2 = _req.info) !== null && _req$info2 !== void 0 && _req$info2.remoteAddress) {
    // see https://git.io/vytQ7
    extendCommaList(headers, 'x-forwarded-for', _req.info.remoteAddress);
    extendCommaList(headers, 'x-forwarded-port', _req.info.remotePort);
    extendCommaList(headers, 'x-forwarded-proto', _req.server.info.protocol);
    extendCommaList(headers, 'x-forwarded-host', _req.info.host);
  }

  const contentType = req.headers['content-type'];

  if (contentType) {
    headers['content-type'] = contentType;
  }

  return headers;
}

const createHandler = ({
  log,
  proxy: {
    readLegacyESConfig,
    pathFilters,
    proxyConfigCollection
  },
  kibanaVersion
}) => async (ctx, request, response) => {
  const {
    body,
    query
  } = request;
  const {
    method,
    path,
    withProductOrigin
  } = query;

  if (kibanaVersion.major < 8) {
    // The "console.proxyFilter" setting in kibana.yaml has been deprecated in 8.x
    // We only read it on the 7.x branch
    if (!pathFilters.some(re => re.test(path))) {
      return response.forbidden({
        body: `Error connecting to '${path}':\n\nUnable to send requests to that path.`,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }

  const legacyConfig = await readLegacyESConfig();
  const {
    hosts
  } = legacyConfig;
  let esIncomingMessage;

  for (let idx = 0; idx < hosts.length; ++idx) {
    const host = hosts[idx];

    try {
      const uri = toURL(host, path); // Because this can technically be provided by a settings-defined proxy config, we need to
      // preserve these property names to maintain BWC.

      const {
        timeout,
        agent,
        headers,
        rejectUnauthorized
      } = getRequestConfig(request.headers, legacyConfig, uri.toString(), kibanaVersion, proxyConfigCollection);
      const requestHeaders = { ...headers,
        ...getProxyHeaders(request),
        // There are a few internal calls that console UI makes to ES in order to get mappings, aliases and templates
        // in the autocomplete mechanism from the editor. At this particular time, those requests generate deprecation
        // logs since they access system indices. With this header we can provide a way to the UI to determine which
        // requests need to deprecation logs and which ones dont.
        ...(withProductOrigin && {
          'x-elastic-product-origin': 'kibana'
        })
      };
      esIncomingMessage = await (0, _lib.proxyRequest)({
        method: method.toLowerCase(),
        headers: requestHeaders,
        uri,
        timeout,
        payload: body,
        rejectUnauthorized,
        agent
      });
      break;
    } catch (e) {
      // If we reached here it means we hit a lower level network issue than just, for e.g., a 500.
      // We try contacting another node in that case.
      log.error(e);

      if (idx === hosts.length - 1) {
        log.warn(`Could not connect to any configured ES node [${hosts.join(', ')}]`);
        return response.customError({
          statusCode: 502,
          body: e
        });
      } // Otherwise, try the next host...

    }
  }

  const {
    statusCode,
    statusMessage,
    headers: {
      warning
    }
  } = esIncomingMessage;

  if (method.toUpperCase() !== 'HEAD') {
    return response.custom({
      statusCode: statusCode,
      body: esIncomingMessage,
      headers: {
        warning: warning || ''
      }
    });
  }

  return response.custom({
    statusCode: statusCode,
    body: `${statusCode} - ${statusMessage}`,
    headers: {
      warning: warning || '',
      'Content-Type': 'text/plain'
    }
  });
};

exports.createHandler = createHandler;