"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reindex = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const reindex = specService => {
  specService.addEndpointDescription('reindex', {
    methods: ['POST'],
    patterns: ['_reindex'],
    data_autocomplete_rules: {
      __template: {
        source: {},
        dest: {}
      },
      source: {
        index: '',
        type: '',
        query: {
          __scope_link: 'GLOBAL.query'
        },
        sort: {
          __template: {
            FIELD: 'desc'
          },
          FIELD: {
            __one_of: ['asc', 'desc']
          }
        },
        size: 1000,
        remote: {
          __template: {
            host: ''
          },
          host: '',
          username: '',
          password: '',
          socket_timeout: '30s',
          connect_timeout: '30s'
        }
      },
      dest: {
        index: '',
        version_type: {
          __one_of: ['internal', 'external']
        },
        op_type: 'create',
        routing: {
          __one_of: ['keep', 'discard', '=SOME TEXT']
        },
        pipeline: ''
      },
      conflicts: 'proceed',
      size: 10,
      script: {
        __scope_link: 'GLOBAL.script'
      }
    }
  });
};

exports.reindex = reindex;