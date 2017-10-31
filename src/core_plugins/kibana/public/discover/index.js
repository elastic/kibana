import 'plugins/kibana/discover/saved_searches/saved_searches';
import 'plugins/kibana/discover/directives/no_results';
import 'plugins/kibana/discover/directives/timechart';
import 'ui/collapsible_sidebar';
import 'plugins/kibana/discover/components/field_chooser/field_chooser';
import 'plugins/kibana/discover/controllers/discover';
import 'plugins/kibana/discover/styles/main.less';
import 'ui/doc_table/components/table_row';
import { KbnDirectoryRegistryProvider, DirectoryCategory } from 'ui/registry/kbn_directory';

KbnDirectoryRegistryProvider.register(() => {
  return {
    id: 'discover',
    title: 'Discover',
    description: 'Search and explore your data.',
    icon: '/plugins/kibana/assets/app_discover.svg',
    path: '/app/kibana#/discover',
    showOnHomePage: true,
    category: DirectoryCategory.DATA
  };
});
