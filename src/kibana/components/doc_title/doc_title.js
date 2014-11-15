define(function (require) {

  require('modules').get('kibana')
  .run(function ($rootScope, docTitle) {
    // always bind to the route events
    $rootScope.$on('$routeChangeStart', docTitle.reset);
    $rootScope.$watch('activeApp', docTitle.ensureAppTitle);
  })
  .service('docTitle', function ($rootScope) {
    var baseTitle = document.title;
    var self = this;

    self.change = function (title, complete) {
      title = [title];

      if (!complete) {
        title.push($rootScope.activeApp && $rootScope.activeApp.name);
        title.push(baseTitle);
      }

      document.title = title.filter(Boolean).join(' - ');
    };

    self.reset = function () {
      self.change(baseTitle, true);
    };

    self.ensureAppTitle = function () {
      if (document.title === baseTitle) {
        self.change();
      }
    };
  });

  // return a "private module" so that it can be used both ways
  return function DoctitleProvider(docTitle) {
    return docTitle;
  };
});