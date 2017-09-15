import 'ui/autoload/all';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import template from './index.html';
import './state/store_service';
import './directives/react';

// TODO: We needed button style support. Remove this and hackery.less when you can
import 'bootstrap/dist/css/bootstrap.css';
import './style/main.less';




import { App } from './components/app';

const app = uiModules.get('apps/canvas', []);

uiRoutes.enable();
uiRoutes.when('/', { template });

app.controller('kibanaReact', function ($scope) {
  $scope.component = App;
});
