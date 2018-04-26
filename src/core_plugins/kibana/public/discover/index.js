import './saved_searches/saved_searches';
import './directives';
import 'ui/collapsible_sidebar';
import './components/field_chooser/field_chooser';
import './controllers/discover';
import './styles/main.less';
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
