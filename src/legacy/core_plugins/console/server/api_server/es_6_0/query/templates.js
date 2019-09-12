/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const regexpTemplate = {
  FIELD: 'REGEXP',
};
export const fuzzyTemplate = {
  FIELD: {},
};
export const prefixTemplate = {
  FIELD: {
    value: '',
  },
};
export const rangeTemplate = {
  FIELD: {
    gte: 10,
    lte: 20,
  },
};
export const spanFirstTemplate = {
  match: {
    span_term: {
      FIELD: 'VALUE',
    },
  },
  end: 3,
};
export const spanNearTemplate = {
  clauses: [
    {
      span_term: {
        FIELD: {
          value: 'VALUE',
        },
      },
    },
  ],
  slop: 12,
  in_order: false,
};
export const spanTermTemplate = {
  FIELD: {
    value: 'VALUE',
  },
};
export const spanNotTemplate = {
  include: {
    span_term: {
      FIELD: {
        value: 'VALUE',
      },
    },
  },
  exclude: {
    span_term: {
      FIELD: {
        value: 'VALUE',
      },
    },
  },
};
export const spanOrTemplate = {
  clauses: [
    {
      span_term: {
        FIELD: {
          value: 'VALUE',
        },
      },
    },
  ],
};
export const spanContainingTemplate = {
  little: {
    span_term: {
      FIELD: {
        value: 'VALUE',
      },
    },
  },
  big: {
    span_near: {
      clauses: [
        {
          span_term: {
            FIELD: {
              value: 'VALUE',
            },
          },
        },
        {
          span_term: {
            FIELD: {
              value: 'VALUE',
            },
          },
        },
      ],
      slop: 5,
      in_order: false,
    },
  },
};
export const spanWithinTemplate = {
  little: {
    span_term: {
      FIELD: {
        value: 'VALUE',
      },
    },
  },
  big: {
    span_near: {
      clauses: [
        {
          span_term: {
            FIELD: {
              value: 'VALUE',
            },
          },
        },
        {
          span_term: {
            FIELD: {
              value: 'VALUE',
            },
          },
        },
      ],
      slop: 5,
      in_order: false,
    },
  },
};
export const wildcardTemplate = {
  FIELD: {
    value: 'VALUE',
  },
};
