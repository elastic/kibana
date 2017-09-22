import 'ui/autoload/all';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import template from './index.html';
import './state/store_service';
import './directives/react';
import './style/main.less';
import { initialize as initializeFullscreen } from './lib/fullscreen';

import { App } from './components/app';

initializeFullscreen(document);

const app = uiModules.get('apps/canvas', []);

uiRoutes.enable();
uiRoutes.when('/', { template });

app.controller('kibanaReact', function ($scope) {
  $scope.component = App;
});
