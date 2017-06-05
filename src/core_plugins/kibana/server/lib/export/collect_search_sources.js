import collectIndexPatterns from './collect_index_patterns';

export const deps = { collectIndexPatterns };

export default function collectSearchSources(savedObjectsClient, panels) {
  const docs = panels.reduce((acc, panel) => {
    const { savedSearchId } = panel.attributes;
    if (savedSearchId) {
      if (!acc.find(s => s.id === savedSearchId) && !panels.find(p => p.id === savedSearchId)) {
        acc.push({ type: 'search', id: savedSearchId });
      }
    }
    return acc;
  }, []);

  if (docs.length === 0) {
    return Promise.resolve([]);
  }

  return savedObjectsClient.bulkGet(docs)
    .then(savedSearches => {
      return deps.collectIndexPatterns(savedObjectsClient, savedSearches)
        .then(resp => {
          return savedSearches.concat(resp);
        });
    });
}
