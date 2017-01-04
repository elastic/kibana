import management from 'ui/management';
import './edit';
import './menu';

management.getSection('elasticsearch').register('pipelines', {
  display: 'Pipelines',
  order: 1,
  configFlag: 'prototypes:pipelines',
  url: '#/management/elasticsearch/pipelines/'
});
