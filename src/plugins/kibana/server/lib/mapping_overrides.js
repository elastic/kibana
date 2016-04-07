export default {
  _source: {
    type: '_source',
    indexed: false,
    analyzed: false,
    doc_values: false
  },
  _index: {
    type: 'string',
    indexed: false,
    analyzed: false,
    doc_values: false
  },
  _type: {
    type: 'string',
    indexed: false,
    analyzed: false,
    doc_values: false
  },
  _id: {
    type: 'string',
    indexed: false,
    analyzed: false,
    doc_values: false
  },
  _timestamp: {
    type: 'date',
    indexed: true,
    analyzed: false,
    doc_values: false
  },
  _score: {
    type: 'number',
    indexed: false,
    analyzed: false,
    doc_values: false
  }
};
