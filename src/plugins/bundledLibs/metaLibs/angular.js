require('jquery');
require('node_modules/angular/angular');
module.exports = window.angular;

require('bower_components/angular-bindonce/bindonce');
require('bower_components/angular-elastic/elastic');
require('bower_components/angular-route/angular-route');

require('ui/modules').get('kibana', ['ngRoute', 'monospaced.elastic', 'pasvaz.bindonce']);
