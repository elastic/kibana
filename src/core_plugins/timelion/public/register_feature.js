import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'timelion',
    title: 'Timelion',
    description: 'Build powerful time based visualizations thru expressions.',
    icon: '/plugins/kibana/assets/app_timelion.svg',
    path: '/app/timelion',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
