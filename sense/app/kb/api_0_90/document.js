define(function () {
  'use strict';

  return function init(api) {
    api.addEndpointDescription('_get_doc', {
      methods: ['GET'],
      patterns: [
        "{index}/{type}/{id}"
      ]
    });
    api.addEndpointDescription('_get_doc_source', {
      methods: ['GET'],
      patterns: [
        "{index}/{type}/{id}/_source"
      ]
    });
    api.addEndpointDescription('_delete_doc', {
      methods: ['DELETE'],
      patterns: [
        "{index}/{type}/{id}/"
      ]
    });
    api.addEndpointDescription('index_doc', {
      methods: ['PUT', 'POST'],
      patterns: [
        "{index}/{type}/{id}"
      ]
    });
    api.addEndpointDescription('index_doc_no_id', {
      methods: ['POST'],
      patterns: [
        "{index}/{type}"
      ]
    });

  }
});