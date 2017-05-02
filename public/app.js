
import './state/store_service';
import 'ui/autoload/all';
import './directives/react';

import { App } from './containers/app/app';

require('./main.less');

const app = require('ui/modules').get('apps/canvas', []);

require('ui/routes').enable();
require('ui/routes')
  .when('/', {
    template: require('plugins/canvas/index.html')
  });

app
.controller('kibanaReact', function ($scope) {
  $scope.component = App;
});
