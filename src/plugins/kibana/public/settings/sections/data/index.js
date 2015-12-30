require('plugins/kibana/settings/sections/data/filebeat/index');

require('ui/routes')
  .when('/settings/data', {
    template: require('plugins/kibana/settings/sections/data/index.html')
  });

module.exports = {
  name: 'data',
  display: 'Data',
  url: '#/settings/data'
};
