import processorRegistry from 'ui/registry/pipelines_processors';
import ViewModel from './view_model';
import './directive';

//NOTE: This processor gets added to the registry, but will not appear in the
//processor dropdown because kibana checks with elasticsearch to determine which
//processors are installed on the cluster. 'Unknown' should not be a valid
//processor.
processorRegistry.register(() => {
  return {
    id: 'unknown',
    name: 'Unknown',
    ViewModel: ViewModel
  };
});
