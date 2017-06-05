export default function collectIndexPatterns(savedObjectsClient, panels) {
  const docs = panels.reduce((acc, panel) => {
    const { kibanaSavedObjectMeta, savedSearchId } = panel.attributes;

    if (kibanaSavedObjectMeta && !savedSearchId) {
      const searchSource = JSON.parse(kibanaSavedObjectMeta.searchSourceJSON);

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
