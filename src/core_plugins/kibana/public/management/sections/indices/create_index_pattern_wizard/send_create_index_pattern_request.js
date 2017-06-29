export function sendCreateIndexPatternRequest(indexPatterns, {
  id,
  timeFieldName,
  notExpandable,
}) {
  // get an empty indexPattern to start
  return indexPatterns.get()
    .then(indexPattern => {
      // set both the id and title to the same value
      indexPattern.id = indexPattern.title = id;

      Object.assign(indexPattern, {
        timeFieldName,
        notExpandable,
      });

      // fetch the fields
      return indexPattern.create();
    });
}
