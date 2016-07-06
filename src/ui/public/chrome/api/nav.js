import { parse, format } from 'url';
import { startsWith, isString, find } from 'lodash';

export default function (chrome, internals) {
  chrome.getNavLinks = function () {
    return internals.nav;
  };

  chrome.getNavLinkById = (id) => {
    const navLink = internals.nav.find(link => link.id === id);
    if (!navLink) {
      throw new Error(`Nav link for id = ${id} not found`);
    }
    return navLink;
  };

  chrome.getBasePath = function () {
    return internals.basePath || '';
  };

  chrome.addBasePath = function (url) {
    let isUrl = url && isString(url);
    if (!isUrl) return url;

    let parsed = parse(url, true);
    if (!parsed.host && parsed.pathname) {
      if (parsed.pathname[0] === '/') {
        parsed.pathname = chrome.getBasePath() + parsed.pathname;
      }
    }

    return format({
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      query: parsed.query,
      hash: parsed.hash,
    });
  };

  function lastSubUrlKey(link) {
    return `lastSubUrl:${link.url}`;
  }

  function setLastUrl(link, url) {
    if (link.linkToLastSubUrl === false) {
      return;
    }

    link.lastSubUrl = url;
    internals.appUrlStore.setItem(lastSubUrlKey(link), url);
  }

  function refreshLastUrl(link) {
    link.lastSubUrl = internals.appUrlStore.getItem(lastSubUrlKey(link)) || link.lastSubUrl || link.url;
  }

  function getAppId(url) {
    const pathname = parse(url).pathname;
    const pathnameWithoutBasepath = pathname.slice(chrome.getBasePath().length);
    const match = pathnameWithoutBasepath.match(/^\/app\/([^\/]+)(?:\/|\?|#|$)/);
    if (match) return match[1];
  }

  function decodeKibanaUrl(url) {
    const parsedUrl = parse(url, true);
    const appId = getAppId(parsedUrl);
    const hash = parsedUrl.hash || '';
    const parsedHash = parse(hash.slice(1), true);
    const globalState = parsedHash.query && parsedHash.query._g;
    return { appId, globalState, parsedUrl, parsedHash };
  }

  function injectNewGlobalState(link, fromAppId, newGlobalState) {
    // parse the lastSubUrl of this link so we can manipulate its parts
    const { appId: toAppId, parsedHash: toHash, parsedUrl: toParsed } = decodeKibanaUrl(link.lastSubUrl);

    // don't copy global state if links are for different apps
    if (fromAppId !== toAppId) return;

    // add the new globalState to the hashUrl in the linkurl
    const toHashQuery = toHash.query || {};
    toHashQuery._g = newGlobalState;

    // format the new subUrl and include the newHash
    link.lastSubUrl = format({
      protocol: toParsed.protocol,
      port: toParsed.port,
      hostname: toParsed.hostname,
      pathname: toParsed.pathname,
      query: toParsed.query,
      hash: format({
        pathname: toHash.pathname,
        query: toHashQuery,
        hash: toHash.hash,
      }),
    });
  }

  internals.trackPossibleSubUrl = function (url) {
    const { appId, globalState: newGlobalState } = decodeKibanaUrl(url);

    for (const link of internals.nav) {
      const matchingTab = find(internals.tabs, { rootUrl: link.url });

      link.active = startsWith(url, link.url);
      if (link.active) {
        setLastUrl(link, url);
        continue;
      }

      if (matchingTab) {
        setLastUrl(link, matchingTab.getLastUrl());
      } else {
        refreshLastUrl(link);
      }

      if (newGlobalState) {
        injectNewGlobalState(link, appId, newGlobalState);
      }
    }
  };

  internals.nav.forEach(link => {
    // convert all link urls to absolute urls
    let a = document.createElement('a');
    a.setAttribute('href', link.url);
    link.url = a.href;
  });

  // simulate a possible change in url to initialize the
  // link.active and link.lastUrl properties
  internals.trackPossibleSubUrl(document.location.href);
};
