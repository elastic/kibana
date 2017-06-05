import _ from 'lodash';
export default function handleAnnotationResponse(resp, annotation) {
  return _.get(resp, `aggregations.${annotation.id}.buckets`, [])
    .filter(bucket => bucket.hits.hits.total)
    .map((bucket) => {
      return {
        key: bucket.key,
        docs: bucket.hits.hits.hits.map(doc => doc._source)
      };
    });
}
