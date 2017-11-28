import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './index.html';
import { App } from '../../components/app';

uiRoutes.when('/', { template });

const app = uiModules.get('apps/canvas', []);
app.controller('canvasWorkpad', function ($scope) {
  $scope.component = App;
});
