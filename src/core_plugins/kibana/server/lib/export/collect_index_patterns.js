export default function collectIndexPatterns(savedObjectsClient, panels) {
  const docs = panels.reduce((acc, panel) => {
    const { kibanaSavedObjectMeta, savedSearchId } = panel.attributes;

    if (kibanaSavedObjectMeta && kibanaSavedObjectMeta.searchSourceJSON && !savedSearchId) {
      let searchSource;
      try {
        searchSource = JSON.parse(kibanaSavedObjectMeta.searchSourceJSON);
        if (!searchSource.index) return acc;
      } catch (err) {
        return acc;
      }

      if (!acc.find(s => s.id === searchSource.index)) {
        acc.push({ type: 'index-pattern', id: searchSource.index });
      }
    }
    return acc;
  }, []);

  if (docs.length === 0) {
    return Promise.resolve([]);
  }

  return savedObjectsClient.bulkGet(docs);

}
