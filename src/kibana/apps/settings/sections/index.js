define(function (require) {
  // each of these private modules returns an object defining that section, their properties
  // are used to create the nav bar
  return [
    require('./indices/index'),
    require('./advanced/index'),
    require('./objects/index')
  ];
});