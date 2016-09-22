import './styles/main.less';
import './editor/editor';
import './editor/add_bucket_agg';
import './editor/agg';
import './editor/agg_add';
import './editor/agg_filter';
import './editor/agg_group';
import './editor/agg_param';
import './editor/agg_params';
import './editor/nesting_indicator';
import './editor/sidebar';
import './editor/vis_options';
import './editor/draggable_container';
import './editor/draggable_item';
import './editor/draggable_handle';
import './saved_visualizations/_saved_vis';
import './saved_visualizations/saved_visualizations';
import '../discover/saved_searches/saved_searches';
import '../../../../ui/public/directives/saved_object_finder';
import '../../../../ui/public/directives/paginated_selectable_list';

import routes from '../../../../ui/public/routes';
import modules from '../../../../ui/public/modules';
import RegistryVisTypesProvider from '../../../../ui/public/registry/vis_types';

const module = modules.get('app/visualize', ['kibana/courier']);

import step1Template from './wizard/step_1.html';
import step1Controller from './wizard/step_1_controller';
step1Controller(module, RegistryVisTypesProvider);

import step2Template from './wizard/step_2.html';
import step2Controller from './wizard/step_2_controller';
step2Controller(module);

routes
  .defaults(/visualize/, {
    requireDefaultIndex: true
  })
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  })
  .when('/visualize/step/1', {
    template: step1Template,
    controller: 'VisualizeWizardStep1',
  })
  .when('/visualize/step/2', {
    template: step2Template,
    controller: 'VisualizeWizardStep2',
    resolve: {
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    },
  });

// preloading

import savedObjectRegistry from '../../../../ui/public/saved_objects/saved_object_registry';
import savedVisualizationRegister from './saved_visualizations/saved_visualization_register';
savedObjectRegistry.register(savedVisualizationRegister);
