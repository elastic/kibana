import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import template from 'plugins/canvas/index.html';
import 'ui/autoload/all';
import './state/store_service';
import './directives/react';

import { App } from './containers/app/app';

require('./main.less');

const app = uiModules.get('apps/canvas', []);

uiRoutes.enable();
uiRoutes.when('/', { template });

app.controller('kibanaReact', function ($scope) {
  $scope.component = App;
});
