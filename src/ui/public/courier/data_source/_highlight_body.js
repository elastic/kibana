import _ from 'lodash';
import 'ui/highlight/highlight_tags';

const FRAGMENT_SIZE = Math.pow(2, 31) - 1; // Max allowed value for fragment_size (limit of a java int)

/**
 * Generates a `highlight_query` corresponding to the given query by setting `"all_fields": true` on any found `query_string` queries
 */
function getHighlightQuery(query) {
  const clone = _.cloneDeep(query);

  if (_.has(clone, 'query_string')) {
    clone.query_string.all_fields = true;
  } else if (_.has(clone, 'bool.must')) {
    clone.bool.must = clone.bool.must.map(getHighlightQuery);
  }

  return clone;
}

function getHighlightParams({ highlightTags, highlightQuery }) {
  const options = {
    pre_tags: [highlightTags.pre],
    post_tags: [highlightTags.post],
    fields: {
      '*': {}
    },
    fragment_size: FRAGMENT_SIZE
  };

  if (highlightQuery) options.fields['*'].highlight_query = highlightQuery;

  return options;
}

export default function highlightBodyProvider(config, highlightTags) {
  if (!config.get('doc_table:highlight')) {
    return _.noop;
  }

  return function highlightBody(body) {
    const highlightQuery = config.get('doc_table:highlight:all_fields') ? getHighlightQuery(body.query) : null;
    body.highlight = getHighlightParams({ highlightTags, highlightQuery });
  };
}
