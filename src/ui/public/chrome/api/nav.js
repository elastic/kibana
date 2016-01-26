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

  internals.navTrackers = [];
  chrome.addNavigationTracker = function (url, handler) {
    internals.navTrackers.push({
      url, handler
    });
  };

  internals.trackPossibleSubUrl = function (url, persist) {
    for (const tracker of internals.navTrackers) {
      if (startsWith(url, tracker.url)) {
        if (persist) {
          tracker.lastSubUrl = url;
          internals.appUrlStore.setItem(`lastSubUrl:${tracker.url}`, url);
        }
        tracker.active = true;
      }

      tracker.handler(tracker.active, tracker.lastSubUrl);
    }
  };

  internals.nav.forEach(link => {
    // convert all link urls to absolute urls

    var a = document.createElement('a');
    a.setAttribute('href', link.url);
    link.url = a.href;
    link.lastSubUrl = chrome.getLastSubUrlFor(link.url);

    if (link.url === chrome.getAppUrl()) {
      link.active = true;
    }
  });

};
