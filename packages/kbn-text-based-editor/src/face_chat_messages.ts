/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const messages = [
  {
    '@timestamp': '2024-01-29T12:20:33.788Z',
    message: {
      role: 'user',
      content:
        'I want the average of bytes from kibana_sample_data_logs, do not add quotes in the index, for the first 10 rows\n',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:33.860Z',
    message: {
      role: 'assistant',
      content: '',
      function_call: {
        name: 'recall',
        arguments: '{"queries":[],"contexts":[]}',
        trigger: 'assistant',
      },
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:37.490Z',
    message: {
      name: 'recall',
      content: '[]',
      role: 'user',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:41.263Z',
    message: {
      content: '',
      function_call: {
        name: 'execute_query',
        arguments: '{\n  "query": "SELECT AVG(bytes) FROM kibana_sample_data_logs LIMIT 10"\n}',
        trigger: 'assistant',
      },
      role: 'assistant',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:41.273Z',
    message: {
      name: 'execute_query',
      content:
        "{\"message\":\"ResponseError: parsing_exception\\n\\tCaused by:\\n\\t\\tinput_mismatch_exception: null\\n\\tRoot causes:\\n\\t\\tparsing_exception: line 1:1: mismatched input 'SELECT' expecting {'explain', 'from', 'row', 'show'}\",\"error\":{\"name\":\"ResponseError\",\"message\":\"parsing_exception\\n\\tCaused by:\\n\\t\\tinput_mismatch_exception: null\\n\\tRoot causes:\\n\\t\\tparsing_exception: line 1:1: mismatched input 'SELECT' expecting {'explain', 'from', 'row', 'show'}\"}}",
      role: 'user',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:42.929Z',
    message: {
      content: '',
      function_call: {
        name: 'esql',
        arguments: '{\n  "switch": true\n}',
        trigger: 'assistant',
      },
      role: 'assistant',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:48.221Z',
    message: {
      name: 'esql',
      content: '{}',
      role: 'user',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:57.638Z',
    message: {
      content:
        'To calculate the average of bytes from the `kibana_sample_data_logs` index for the first 10 rows, you can use the `FROM`, `STATS`, and `LIMIT` commands. The `AVG` function can be used within the `STATS` command to calculate the average.\n\nHere is the ES|QL query:\n\n```esql\nFROM kibana_sample_data_logs\n| STATS AVG(bytes)\n| LIMIT 10\n```\n\nThis query will return a table with a single row and a single column that contains the average of the `bytes` field for the first 10 rows in the `kibana_sample_data_logs` index.',
      function_call: {
        name: 'execute_query',
        arguments:
          '{"query":"\\nFROM kibana_sample_data_logs\\n| STATS AVG(bytes)\\n| LIMIT 10\\n"}',
        trigger: 'assistant',
      },
      role: 'assistant',
    },
  },
  {
    '@timestamp': '2024-01-29T12:20:57.662Z',
    message: {
      name: 'execute_query',
      content: '{"columns":[{"name":"AVG(bytes)","type":"double"}],"values":[[5664.749822367487]]}',
      role: 'user',
    },
  },
  {
    '@timestamp': '2024-01-29T12:21:02.810Z',
    message: {
      content:
        'The average of the `bytes` field for the first 10 rows in the `kibana_sample_data_logs` index is approximately 5664.75.',
      function_call: {
        name: '',
        arguments: '',
        trigger: 'assistant',
      },
      role: 'assistant',
    },
  },
];
