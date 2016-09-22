import processorRegistry from 'ui/registry/pipelines_processors';
import ViewModel from './view_model';
import './directive';

processorRegistry.register(() => {
  return {
    id: 'split',
    name: 'Split',
    ViewModel: ViewModel
  };
});
