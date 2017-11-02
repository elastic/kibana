import { management } from 'ui/management';
import 'plugins/kibana/management/sections/objects/_view';
import 'plugins/kibana/management/sections/objects/_objects';
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
    title: 'Saved objects',
    description: 'Import / export your kibana objects for later reuse.',
    icon: '/plugins/kibana/assets/app_dashboard.svg',
    path: '/app/kibana#/management/kibana/objects',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN
  };
});
