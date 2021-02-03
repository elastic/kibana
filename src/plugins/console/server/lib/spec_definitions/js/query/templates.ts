/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
