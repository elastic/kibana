export function sendCreateIndexPatternRequest(indexPatterns, {
  id,
  timeFieldName,
  intervalName,
  notExpandable,
}) {
  // get an empty indexPattern to start
  return indexPatterns.get()
    .then(indexPattern => {
      // set both the id and title to the same value
      indexPattern.id = indexPattern.title = id;

      Object.assign(indexPattern, {
        timeFieldName,
        intervalName,
        notExpandable,
      });

      // fetch the fields
      return indexPattern.create();
    });
}
