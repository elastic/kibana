require('jquery');
require('node_modules/angular/angular');
module.exports = window.angular;

require('node_modules/angular-bindonce/bindonce');
require('node_modules/angular-elastic/elastic');
require('node_modules/angular-route/angular-route');
require('node_modules/angular-cookies/angular-cookies');

require('ui/modules').get('kibana', [
  'ngRoute',
  'ngCookies',
  'monospaced.elastic',
  'pasvaz.bindonce'
]);
