define(function (require) {
  // each of these private modules returns an object defining that section, their properties
  // are used to create the nav bar
  return [
    require('plugins/kibana/settings/sections/indices/index'),
    require('plugins/kibana/settings/sections/advanced/index'),
    require('plugins/kibana/settings/sections/objects/index'),
    require('plugins/kibana/settings/sections/about/index')
  ];
});
