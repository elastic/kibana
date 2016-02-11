import { parse, format } from 'url';
import { startsWith, isString, find } from 'lodash';

export default function (chrome, internals) {
  chrome.getNavLinks = function () {
    return internals.nav;
  };

  chrome.getBasePath = function () {
    return internals.basePath || '';
  };

  chrome.addBasePath = function (url) {
    var isUrl = url && isString(url);
    if (!isUrl) return url;

    var parsed = parse(url);
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
    link.lastSubUrl = url;
    internals.appUrlStore.setItem(lastSubUrlKey(link), url);
  }

  function refreshLastUrl(link) {
    link.lastSubUrl = internals.appUrlStore.getItem(lastSubUrlKey(link));
  }

  internals.trackPossibleSubUrl = function (url) {
    for (const link of internals.nav) {
      link.active = startsWith(url, link.url);

      if (link.active) {
        setLastUrl(link, url);
        continue;
      }

      const matchingTab = find(internals.tabs, { rootUrl: link.url });
      if (matchingTab) {
        setLastUrl(link, matchingTab.getLastUrl());
        continue;
      }

      refreshLastUrl(link);
    }
  };

  internals.nav.forEach(link => {
    // convert all link urls to absolute urls
    var a = document.createElement('a');
    a.setAttribute('href', link.url);
    link.url = a.href;
  });

  // simulate a possible change in url to initialize the
  // link.active and link.lastUrl properties
  internals.trackPossibleSubUrl(document.location.href);
};
