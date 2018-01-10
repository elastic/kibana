import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { App } from '../../components/app';
import template from './index.html';

uiRoutes.when('/', { template });

const app = uiModules.get('apps/canvas', []);
app.controller('canvasWorkpad', function ($scope) {
  $scope.component = App;
});
