import { uiModules } from 'ui/modules';
import tileMapTemplate from './tile_map_vis_params.html';
import './wms_options';
const module = uiModules.get('kibana');
module.directive('tileMapVisParams', function () {
  return {
    restrict: 'E',
    template: tileMapTemplate
  };
});
