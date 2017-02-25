function stubbedLogstashFields() {
  return [
    //                                  |indexed
    //                                  |      |analyzed
    //                                  |      |      |aggregatable
    //                                  |      |      |      |searchable
    // name                type         |      |      |      |     |metadata
    ['bytes',             'number',     true,  true,  true,  true,  { count: 10, docValues: true } ],
    ['ssl',               'boolean',    true,  true,  true,  true,  { count: 20 } ],
    ['@timestamp',        'date',       true,  true,  true,  true,  { count: 30 } ],
    ['time',              'date',       true,  true,  true,  true,  { count: 30 } ],
    ['@tags',             'string',     true,  true,  true,  true ],
    ['utc_time',          'date',       true,  true,  true,  true ],
    ['phpmemory',         'number',     true,  true,  true,  true ],
    ['ip',                'ip',         true,  true,  true,  true ],
    ['request_body',      'attachment', true,  true,  true,  true ],
    ['point',             'geo_point',  true,  true,  true,  true ],
    ['area',              'geo_shape',  true,  true,  true,  true ],
    ['hashed',            'murmur3',    true,  true,  false, true ],
    ['geo.coordinates',   'geo_point',  true,  true,  true,  true ],
    ['extension',         'string',     true,  true,  true,  true ],
    ['machine.os',        'string',     true,  true,  true,  true ],
    ['machine.os.raw',    'string',     true,  false, true,  true,  { docValues: true } ],
    ['geo.src',           'string',     true,  true,  true,  true ],
    ['_id',               'string',     false, false, true,  true ],
    ['_type',             'string',     false, false, true,  true ],
    ['_source',           'string',     false, false, true,  true ],
    ['non-filterable',    'string',     false, false, true,  false],
    ['non-sortable',      'string',     false, false, false, false],
    ['custom_user_field', 'conflict',   false, false, true,  true ],
    ['script string',     'string',     false, false, true,  false, { script: '\'i am a string\'' } ],
    ['script number',     'number',     false, false, true,  false, { script: '1234' } ],
    ['script date',       'date',       false, false, true,  false, { script: '1234', lang: 'painless' } ],
    ['script murmur3',    'murmur3',    false, false, true,  false, { script: '1234' } ],
  ].map(function (row) {
    const [
      name,
      type,
      indexed,
      analyzed,
      aggregatable,
      searchable,
      metadata = {}
    ] = row;

    const {
      docValues = false,
      count = 0,
      script,
      lang = script ? 'expression' : undefined,
      scripted = !!script,
    } = metadata;

    return {
      name,
      type,
      doc_values: docValues,
      indexed,
      analyzed,
      aggregatable,
      searchable,
      count,
      script,
      lang,
      scripted,
    };
  });
}

export default stubbedLogstashFields;
