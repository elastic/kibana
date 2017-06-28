import { get } from 'lodash';

import { collectIndexPatterns } from './collect_index_patterns';
import { collectSearchSources } from './collect_search_sources';


export async function collectPanels(savedObjectsClient, dashboard) {
  let panels;
  try {
    panels = JSON.parse(get(dashboard, 'attributes.panelsJSON', '[]'));
  } catch(err) {
    panels = [];
  }

  if (panels.length === 0) return [].concat([dashboard]);

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(panels);
  const [ indexPatterns, searchSources ] = await Promise.all([
    collectIndexPatterns(savedObjectsClient, savedObjects),
    collectSearchSources(savedObjectsClient, savedObjects)
  ]);

  return savedObjects.concat(indexPatterns).concat(searchSources).concat([dashboard]);
}
