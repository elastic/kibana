export const data_streamEcs = {
  dataset: {
    dashed_name: 'data-stream-dataset',
    description: 'The field can contain anything that makes sense to signify the source of the data.\n' +
      'Examples include `nginx.access`, `prometheus`, `endpoint` etc. For data streams that otherwise fit, but that do not have dataset set we use the value "generic" for the dataset value. `event.dataset` should have the same value as `data_stream.dataset`.\n' +
      'Beyond the Elasticsearch data stream naming criteria noted above, the `dataset` value has additional restrictions:\n' +
      '  * Must not contain `-`\n' +
      '  * No longer than 100 characters',
    example: 'nginx.access',
    flat_name: 'data_stream.dataset',
    level: 'extended',
    name: 'dataset',
    normalize: [],
    short: 'The field can contain anything that makes sense to signify the source of the data.',
    type: 'constant_keyword'
  },
  namespace: {
    dashed_name: 'data-stream-namespace',
    description: 'A user defined namespace. Namespaces are useful to allow grouping of data.\n' +
      'Many users already organize their indices this way, and the data stream naming scheme now provides this best practice as a default. Many users will populate this field with `default`. If no value is used, it falls back to `default`.\n' +
      'Beyond the Elasticsearch index naming criteria noted above, `namespace` value has the additional restrictions:\n' +
      '  * Must not contain `-`\n' +
      '  * No longer than 100 characters',
    example: 'production',
    flat_name: 'data_stream.namespace',
    level: 'extended',
    name: 'namespace',
    normalize: [],
    short: 'A user defined namespace. Namespaces are useful to allow grouping of data.',
    type: 'constant_keyword'
  },
  type: {
    dashed_name: 'data-stream-type',
    description: 'An overarching type for the data stream.\n' +
      'Currently allowed values are "logs" and "metrics". We expect to also add "traces" and "synthetics" in the near future.',
    example: 'logs',
    flat_name: 'data_stream.type',
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'An overarching type for the data stream.',
    type: 'constant_keyword'
  }
}