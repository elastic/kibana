import 'plugins/kibana/discover/saved_searches/saved_searches';
import 'plugins/kibana/discover/directives/no_results';
import 'plugins/kibana/discover/directives/timechart';
import 'ui/collapsible_sidebar';
import 'plugins/kibana/discover/components/field_chooser/field_chooser';
import 'plugins/kibana/discover/controllers/discover';
import 'plugins/kibana/discover/styles/main.less';
import 'ui/doc_table/components/table_row';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'discover',
    title: 'Discover',
    description: 'Interactively explore your data by querying and filtering raw documents.',
    icon: '/plugins/kibana/assets/app_discover.svg',
    path: '/app/kibana#/discover',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
