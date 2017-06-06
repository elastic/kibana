import { get } from 'lodash';

import collectIndexPatterns from './collect_index_patterns';
import collectSearchSources from './collect_search_sources';

export const deps = {
  collectSearchSources,
  collectIndexPatterns
};

export default function collectPanels(savedObjectsClient, dashboard) {
  let panels;
  try {
    panels = JSON.parse(get(dashboard, 'attributes.panelsJSON', '[]'));
    if (!panels) throw new Error('No panels found');
  } catch(err) {
    return Promise.resolve([].concat([dashboard]));
  }

  return savedObjectsClient.bulkGet(panels)
    .then(resp => {
      return Promise.all([
        deps.collectIndexPatterns(savedObjectsClient, resp),
        deps.collectSearchSources(savedObjectsClient, resp)
      ]).then(results => {
        return resp
          .concat(results[0])
          .concat(results[1])
          .concat([dashboard]);
      });
    });
}
