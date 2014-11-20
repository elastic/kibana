define(function (require) {

  require('modules').get('kibana')
  .run(function ($rootScope, docTitle) {
    // always bind to the route events
    $rootScope.$on('$routeChangeStart', docTitle.reset);
    $rootScope.$on('$routeChangeError', docTitle.update);
    $rootScope.$on('$routeChangeSuccess', docTitle.update);
    $rootScope.$watch('activeApp', docTitle.update);
  })
  .service('docTitle', function ($rootScope) {
    var baseTitle = document.title;
    var self = this;

    var lastChange;

    function render() {
      lastChange = lastChange || [];

      var parts = [lastChange[0]];

      if ($rootScope.activeApp) {
        parts.push($rootScope.activeApp.name);
      }

      if (!lastChange[1]) {
        parts.push(baseTitle);
      }

      return parts.filter(Boolean).join(' - ');
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