define(function (require) {
  return function GetFieldTyles($route) {
    var indexPattern = $route.current.locals.indexPattern;

    return [{
      title: 'fields',
      index: 'fields'
    }, {
      title: 'scripted fields',
      index: 'scriptedFields'
    }];
  };
});