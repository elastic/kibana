import  _ from 'lodash';
import Api from './api';
import { getSpec } from './spec';
const parts = [
  require('./es_6_0/aliases'),
  require('./es_6_0/aggregations'),
  require('./es_6_0/document'),
  require('./es_6_0/filter'),
  require('./es_6_0/globals'),
  require('./es_6_0/ingest'),
  require('./es_6_0/mappings'),
  require('./es_6_0/query'),
  require('./es_6_0/reindex'),
  require('./es_6_0/search'),
];

const ES_6_0 = new Api('es_6_0');

const spec = getSpec();
Object.keys(spec).forEach(endpoint => {
  ES_6_0.addEndpointDescription(endpoint, spec[endpoint]);
});
_.each(parts, function (apiSection) {
  apiSection(ES_6_0);
});

export default ES_6_0;
