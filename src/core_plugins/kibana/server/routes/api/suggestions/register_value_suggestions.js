import handleESError from '../../../lib/handle_es_error';
import Boom from 'boom';

export function registerValueSuggestions(server) {
  server.route({
    path: '/api/kibana/suggestions/values/{index}',
    method: ['POST'],
    handler: async function (req, reply) {
      const { index } = req.params;
      const { field: fieldName, query, size } = req.payload;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      const field = await getIndexPatternField(req.getSavedObjectsClient(), index, fieldName);
      if (!field) {
        reply(Boom.badRequest(`Unable to find field ${fieldName} in index-pattern ${index}`));
        return;
      }
      if (field.type !== 'string' && query) {
        reply(Boom.badRequest(`Unable to filter terms aggregation on non-string field type. ${field.name} is of type ${field.type}`));
        return;
      }

      const body = getBody({ field, query, size });
      try {
        const response = await callWithRequest(req, 'search', { index, body });
        const suggestions = response.aggregations.suggestions.buckets.map(bucket => bucket.key);
        reply(suggestions);
      } catch (error) {
        reply(handleESError(error));
      }
    }
  });
}

async function getIndexPatternField(savedObjectClient, index, fieldName) {
  const findResp = await savedObjectClient.find({
    type: 'index-pattern',
    fields: ['title', 'fields'],
    search: `"${index}"`,
    search_fields: ['title']
  });
  const indexPatternSavedObject = findResp.saved_objects.find(savedObject => {
    return savedObject.attributes.title === index;
  });
  if (indexPatternSavedObject) {
    const fields = JSON.parse(indexPatternSavedObject.attributes.fields);
    const field = fields.find(field => {
      return field.name === fieldName;
    });
    return field;
  }
}

function getBody({ field, query, size = 10 }) {
  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map';

  // Helps keep the number of buckets that need to be tracked at the shard level contained in case
  // this is a high cardinality field
  const terminateAfter = 100000;

  // We don't care about the accuracy of the counts, just the content of the terms, so this reduces
  // the amount of information that needs to be transmitted to the coordinating node
  const shardSize = 10;

  const termsAgg = {
    size: size,
    shard_size: shardSize
  };

  if (field.scripted) {
    termsAgg.script = {
      inline: field.script,
      lang: field.lang
    };
  } else {
    termsAgg.field = field.name;
  }

  if (query) {
    termsAgg.include = `${getEscapedQuery(query)}.*`;
    termsAgg.execution_hint = executionHint;
  }

  return {
    size: 0,
    timeout: '1s',
    terminate_after: terminateAfter,
    aggs: {
      suggestions: {
        terms: termsAgg
      }
    }
  };
}

function getEscapedQuery(query = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);
}
