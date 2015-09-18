module.exports = function (chrome, internals) {
  let { startsWith } = require('lodash');

  chrome.getNavLinks = function () {
    return internals.nav;
  };

  chrome.getLastSubUrlFor = function (url) {
    return internals.appUrlStore.getItem(`lastSubUrl:${url}`);
  };

  internals.trackPossibleSubUrl = function (url) {
    for (let link of internals.nav) {
      if (startsWith(url, link.url)) {
        link.lastSubUrl = url;
        internals.appUrlStore.setItem(`lastSubUrl:${link.url}`, url);
      }
    }
  };

  internals.nav.forEach(link => {
    // convert all link urls to absolute urls

    var a = document.createElement('a');
    a.setAttribute('href', link.url);
    link.url = a.href;
    link.lastSubUrl = chrome.getLastSubUrlFor(link.url);
  });

};
