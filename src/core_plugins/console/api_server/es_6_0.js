import Api from './api';
import { getSpec } from './spec';
const ES_6_0 = new Api('es_6_0');
const spec = getSpec();

// adding generated specs
Object.keys(spec).forEach(endpoint => {
  ES_6_0.addEndpointDescription(endpoint, spec[endpoint]);
});

//adding globals and custom API definitions
require('./es_6_0/aliases')(ES_6_0);
require('./es_6_0/aggregations')(ES_6_0);
require('./es_6_0/document')(ES_6_0);
require('./es_6_0/filter')(ES_6_0);
require('./es_6_0/globals')(ES_6_0);
require('./es_6_0/ingest')(ES_6_0);
require('./es_6_0/mappings')(ES_6_0);
require('./es_6_0/query')(ES_6_0);
require('./es_6_0/reindex')(ES_6_0);
require('./es_6_0/search')(ES_6_0);

export default ES_6_0;
