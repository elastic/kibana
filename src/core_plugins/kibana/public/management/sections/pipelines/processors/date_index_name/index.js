import processorRegistry from 'ui/registry/pipelines_processors';
import ViewModel from './view_model';
import './directive';

processorRegistry.register(() => {
  return {
    id: 'date_index_name',
    name: 'Date Index name',
    ViewModel: ViewModel
  };
});
