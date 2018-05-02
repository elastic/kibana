import { management } from 'ui/management';
import './_view';
import './_objects';
import 'ace';
import 'ui/directives/confirm_click';
import { uiModules } from 'ui/modules';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

// add the module deps to this module
uiModules.get('apps/management');

management.getSection('kibana').register('objects', {
  display: 'Saved Objects',
  order: 10,
  url: '#/management/kibana/objects'
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'saved_objects',
    title: 'Saved Objects',
    description: 'Import, export, and manage your saved searches, visualizations, and dashboards.',
    icon: '/plugins/kibana/assets/app_saved_objects.svg',
    path: '/app/kibana#/management/kibana/objects',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
