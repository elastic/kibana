import elasticsearch from 'elasticsearch';
import { map } from 'lodash';

const client = new elasticsearch.Client({
  host: 'localhost:9200',
});

export function getESIndices(kbnIndex) {
  const config = {
    index: kbnIndex,
    _source: 'index-pattern.title',
    q: 'type:"index-pattern"',
  };

  return client
    .search(config)
    .then(resp => {
      return map(resp.hits.hits, '_source["index-pattern"].title');
    });
}
