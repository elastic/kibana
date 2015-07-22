window.jQuery = require('jquery');
window.angular = require('bower_components/angular/angular');

require('bower_components/angular-bootstrap/ui-bootstrap.js');
require('bower_components/angular-bindonce/bindonce');
require('bower_components/angular-elastic/elastic');
require('bower_components/angular-route/angular-route');

require('ui/modules').get('kibana', ['ngRoute', 'monospaced.elastic', 'pasvaz.bindonce']);
