const { startsWith, isString } = require('lodash');
import { parse, format } from 'url';

export default function (chrome, internals) {
  chrome.getNavLinks = function () {
    return internals.nav;
  };

  chrome.getLastSubUrlFor = function (url) {
    return internals.appUrlStore.getItem(`lastSubUrl:${url}`);
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

  internals.trackPossibleSubUrl = function (url) {
    for (const link of internals.nav) {
      if (startsWith(url, link.url)) {
        link.lastSubUrl = url;
        internals.appUrlStore.setItem(`lastSubUrl:${link.url}`, url);
      }
    }
  };

  internals.nav.forEach(link => {
    // convert all link urls to absolute urls

    let a = document.createElement('a');
    a.setAttribute('href', link.url);
    link.url = a.href;
    link.lastSubUrl = chrome.getLastSubUrlFor(link.url);

    if (link.url === chrome.getAppUrl()) {
      link.active = true;
    }
  });

};
