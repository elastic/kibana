define(function (require) {
  // each of these private modules returns an object defining that section, their properties
  // are used to create the nav bar
  return [
    require('apps/settings/sections/indices/index'),
    require('apps/settings/sections/advanced/index'),
    require('apps/settings/sections/objects/index')
  ];
});