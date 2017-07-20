/**
 *  Searches for indices against the _search endpoint
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {String}  pattern The pattern to match against known indices
 *  @param  {Number}  maxNumberOfMatchingIndices The limit of indices to return
 *  @return {Promise<Array<FieldInfo>>}
 */
export async function search(callCluster, pattern, maxNumberOfMatchingIndices = 10) {
  const result = await callCluster('search', {
    index: pattern,
    ignore: [404],
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: maxNumberOfMatchingIndices,
          }
        }
      }
    }
  });

  if (
    result.status === 404
    || !result.aggregations
  ) {
    return [];
  }

  const indices = result.aggregations.indices.buckets.map(bucket => ({
    name: bucket.key,
    docCount: bucket.doc_count,
  }));

  return indices;
}
