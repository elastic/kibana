/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SymbolSchema = {
  symbolInformation: {
    properties: {
      name: {
        type: 'text',
      },
      kind: {
        type: 'integer',
      },
      location: {
        properties: {
          uri: {
            type: 'text',
          },
          range: {
            properties: {
              start: {
                properties: {
                  line: {
                    type: 'integer',
                  },
                  character: {
                    type: 'integer',
                  },
                },
              },
              end: {
                properties: {
                  line: {
                    type: 'integer',
                  },
                  character: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      },
      containerName: {
        type: 'text',
      },
    },
  },
  contents: {
    properties: {
      kind: {
        type: 'text',
      },
      language: {
        type: 'text',
      },
      value: {
        type: 'text',
      },
    },
  },
};
