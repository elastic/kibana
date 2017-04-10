import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import encodeUriQuery from 'encode-uri-query';
import rison from 'rison-node';
import uiModules from 'ui/modules';
import { parse as parseUrl, format as formatUrl } from 'url';
import { stringify as stringifyQuerystring } from 'querystring';

const module = uiModules.get('kibana');

const conservativeStringifyQuerystring = (query) => {
  return stringifyQuerystring(query, null, null, {
    encodeURIComponent: encodeUriQuery
  });
};

const hashStateInQuery = (state, query) => {
  const name = state.getQueryParamName();
  const value = query[state.getQueryParamName()];
  const decodedValue = rison.decode(value);
  const hashedValue = state.toQueryParam(decodedValue);
  return { name, hashedValue };
};

const hashStatesInQuery = (states, query) => {
  const hashedQuery = states.reduce((result, state) => {
    const { name, hashedValue } = hashStateInQuery(state, query);
    result[name] = hashedValue;
    return result;
  }, {});


  return Object.assign({}, query, hashedQuery);
};

const hashUrl = (states, redirectUrl) => {
  // The URLs that we use aren't "conventional" and the hash is appearing before
  // the querystring, even though conventionally they appear after it. The parsedUrl
  // is the entire URL, and the parsedAppUrl is everything after the hash.
  //
  // EXAMPLE
  // parsedUrl: /app/kibana#/visualize/edit/somelongguid?g=()&a=()
  // parsedAppUrl: /visualize/edit/somelongguid?g=()&a=()
  const parsedUrl = parseUrl(redirectUrl);
  const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

  // the parsedAppState actually has the query that we care about
  const query = parsedAppUrl.query;

  const newQuery = hashStatesInQuery(states, query);

  const newHash = formatUrl({
    search: conservativeStringifyQuerystring(newQuery),
    pathname: parsedAppUrl.pathname
  });

  return formatUrl({
    pathname: parsedUrl.pathname,
    hash: newHash
  });
};

module.run(function (AppState, globalState, $window) {
  const redirectUrl = chrome.getInjected('redirectUrl');

  const hashedUrl = hashUrl([new AppState(), globalState], redirectUrl);
  const url = chrome.addBasePath(hashedUrl);

  $window.location = url;
});
