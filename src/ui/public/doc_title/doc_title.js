define(function (require) {
  let _ = require('lodash');
  let chrome = require('ui/chrome');

  require('ui/modules').get('kibana')
  .run(function ($rootScope, docTitle) {
    // always bind to the route events
    $rootScope.$on('$routeChangeStart', docTitle.reset);
    $rootScope.$on('$routeChangeError', docTitle.update);
    $rootScope.$on('$routeChangeSuccess', docTitle.update);
    $rootScope.$watch(_.bindKey(chrome, 'getActiveTabTitle'), docTitle.update);
  })
  .service('docTitle', function ($rootScope) {
    let baseTitle = document.title;
    let self = this;

    let lastChange;

    function render() {
      lastChange = lastChange || [];

      let parts = [lastChange[0]];
      let activeTabTitle = chrome.getActiveTabTitle();

      if (activeTabTitle) parts.push(activeTabTitle);

      if (!lastChange[1]) parts.push(baseTitle);

      return _(parts).flattenDeep().compact().join(' - ');
    }

    self.change = function (title, complete) {
      lastChange = [title, complete];
      self.update();
    };

    self.reset = function () {
      lastChange = null;
    };

    self.update = function () {
      document.title = render();
    };
  });

  // return a "private module" so that it can be used both ways
  return function DoctitleProvider(docTitle) {
    return docTitle;
  };
});
