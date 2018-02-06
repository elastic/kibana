import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'timelion',
    title: 'Timelion',
    description: 'Use an expression language to analyze time series data and visualize the results.',
    icon: '/plugins/kibana/assets/app_timelion.svg',
    path: '/app/timelion',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
