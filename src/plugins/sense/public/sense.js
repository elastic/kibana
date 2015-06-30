define(function (require) {

  require('routes')
  .when('/', {
    template: '<h1>sense</h1>'
  })
  .otherwise({
    redirectTo: '/'
  });

});
