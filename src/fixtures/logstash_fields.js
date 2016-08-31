function stubbedLogstashFields() {
  let sourceData = [
    { name: 'bytes',              type: 'number',     indexed: true,  analyzed: true, sortable:  true,  filterable: true,   count: 10 },
    { name: 'ssl',                type: 'boolean',    indexed: true,  analyzed: true, sortable:  true,  filterable: true,   count: 20 },
    { name: '@timestamp',         type: 'date',       indexed: true,  analyzed: true, sortable:  true,  filterable: true,   count: 30 },
    { name: 'time',               type: 'date',       indexed: true,  analyzed: true, sortable:  true,  filterable: true,   count: 30 },
    { name: '@tags',              type: 'string',     indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'utc_time',           type: 'date',       indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'phpmemory',          type: 'number',     indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'ip',                 type: 'ip',         indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'request_body',       type: 'attachment', indexed: true,  analyzed: true, sortable:  false, filterable: true },
    { name: 'point',              type: 'geo_point',  indexed: true,  analyzed: true, sortable:  false, filterable: false },
    { name: 'area',               type: 'geo_shape',  indexed: true,  analyzed: true, sortable:  true,  filterable: false },
    { name: 'hashed',             type: 'murmur3',    indexed: true,  analyzed: true, sortable:  false, filterable: false },
    { name: 'geo.coordinates',    type: 'geo_point',  indexed: true,  analyzed: true, sortable:  false, filterable: true },
    { name: 'extension',          type: 'string',     indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'machine.os',         type: 'string',     indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: 'geo.src',            type: 'string',     indexed: true,  analyzed: true, sortable:  true,  filterable: true },
    { name: '_type',              type: 'string',     indexed: false,  analyzed: true, sortable:  true,  filterable: true },
    { name: '_id',                type: 'string',     indexed: false, analyzed: false, sortable: false, filterable: true},
    { name: '_source',            type: 'string',     indexed: false, analyzed: false, sortable: false, filterable: false},
    { name: 'custom_user_field',  type: 'conflict',   indexed: false, analyzed: false, sortable: false, filterable: true },
    { name: 'script string',      type: 'string',     scripted: true, script: '\'i am a string\'', lang: 'expression' },
    { name: 'script number',      type: 'number',     scripted: true, script: '1234', lang: 'expression' },
    { name: 'script date',        type: 'date',       scripted: true, script: '1234', lang: 'painless' },
    { name: 'script murmur3',     type: 'murmur3',    scripted: true, script: '1234', lang: 'expression'},
  ].map(function (field) {
    field.count = field.count || 0;
    field.scripted = field.scripted || false;
    return field;
  });

  return sourceData;
}

export default stubbedLogstashFields;
