export function sendCreateIndexPatternRequest(indexPatterns, {
  id,
  name,
  timeFieldName,
  notExpandable,
}) {
  // get an empty indexPattern to start
  return indexPatterns.get()
    .then(indexPattern => {
      Object.assign(indexPattern, {
        id,
        title: name,
        timeFieldName,
        notExpandable,
      });

      // fetch the fields
      return indexPattern.create();
    });
}
