import './styles/main.less';
import './editor/editor';
import './wizard/wizard';
import './editor/agg_filter';
import 'ui/draggable/draggable_container';
import 'ui/draggable/draggable_item';
import 'ui/draggable/draggable_handle';
import './saved_visualizations/_saved_vis';
import './saved_visualizations/saved_visualizations';
import 'ui/directives/scroll_bottom';
import 'ui/filters/sort_prefix_first';
import uiRoutes from 'ui/routes';
import visualizeListingTemplate from './listing/visualize_listing.html';
import { VisualizeListingController } from './listing/visualize_listing';
import { VisualizeConstants } from './visualize_constants';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

uiRoutes
  .defaults(/visualize/, {
    requireDefaultIndex: true
  })
  .when(VisualizeConstants.LANDING_PAGE_PATH, {
    template: visualizeListingTemplate,
    controller: VisualizeListingController,
    controllerAs: 'listingController',
  });

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'visualize',
    title: 'Visualize',
    description: 'Create visualizations and aggregate data stores in your Elasticsearch indices.',
    icon: '/plugins/kibana/assets/app_visualize.svg',
    path: `/app/kibana#${VisualizeConstants.LANDING_PAGE_PATH}`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
