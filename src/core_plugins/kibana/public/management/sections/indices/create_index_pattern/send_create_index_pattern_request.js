export function sendCreateIndexPatternRequest(indexPatterns, {
  id,
  name,
  timeFieldName,
}) {
  // get an empty indexPattern to start
  return indexPatterns.get()
    .then(indexPattern => {
      Object.assign(indexPattern, {
        id,
        title: name,
        timeFieldName,
      });

      // fetch the fields
      return indexPattern.create();
    });
}
