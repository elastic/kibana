import { collectIndexPatterns } from './collect_index_patterns';

export async function collectSearchSources(savedObjectsClient, panels) {
  const docs = panels.reduce((acc, panel) => {
    const { savedSearchId } = panel.attributes;
    if (savedSearchId) {
      if (!acc.find(s => s.id === savedSearchId) && !panels.find(p => p.id === savedSearchId)) {
        acc.push({ type: 'search', id: savedSearchId });
      }
    }
    return acc;
  }, []);

  if (docs.length === 0) return [];

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(docs);
  const indexPatterns = await collectIndexPatterns(savedObjectsClient, savedObjects);

  return savedObjects.concat(indexPatterns);
}
