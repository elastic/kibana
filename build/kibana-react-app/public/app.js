import chrome from 'ui/chrome';
import modules from 'ui/modules';

import 'ui/autoload/all';
import './directives/react';
import './state/store_service';

import rootComponent from './components/app';

require('./main.less');

var app = require('ui/modules').get('apps/rework', []);

require('ui/routes').enable();
require('ui/routes')
  .when('/', {
    template: require('plugins/rework/index.html')
  });

app
.controller('kibanaReact', function ($scope, timefilter) {
  $scope.component = rootComponent;
});
