/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.wildcardTemplate =
  exports.spanWithinTemplate =
  exports.spanTermTemplate =
  exports.spanOrTemplate =
  exports.spanNotTemplate =
  exports.spanNearTemplate =
  exports.spanFirstTemplate =
  exports.spanContainingTemplate =
  exports.regexpTemplate =
  exports.rangeTemplate =
  exports.prefixTemplate =
  exports.fuzzyTemplate =
    void 0;

const regexpTemplate = {
  FIELD: 'REGEXP',
};
exports.regexpTemplate = regexpTemplate;
const fuzzyTemplate = {
  FIELD: {},
};
exports.fuzzyTemplate = fuzzyTemplate;
const prefixTemplate = {
  FIELD: {
    value: '',
  },
};
exports.prefixTemplate = prefixTemplate;
const rangeTemplate = {
  FIELD: {
    gte: 10,
    lte: 20,
  },
};
exports.rangeTemplate = rangeTemplate;
const spanFirstTemplate = {
  match: {
    span_term: {
      FIELD: 'VALUE',
    },
  },
  end: 3,
};
exports.spanFirstTemplate = spanFirstTemplate;
const spanNearTemplate = {
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
exports.spanNearTemplate = spanNearTemplate;
const spanTermTemplate = {
  FIELD: {
    value: 'VALUE',
  },
};
exports.spanTermTemplate = spanTermTemplate;
const spanNotTemplate = {
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
exports.spanNotTemplate = spanNotTemplate;
const spanOrTemplate = {
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
exports.spanOrTemplate = spanOrTemplate;
const spanContainingTemplate = {
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
exports.spanContainingTemplate = spanContainingTemplate;
const spanWithinTemplate = {
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
exports.spanWithinTemplate = spanWithinTemplate;
const wildcardTemplate = {
  FIELD: {
    value: 'VALUE',
  },
};
exports.wildcardTemplate = wildcardTemplate;
