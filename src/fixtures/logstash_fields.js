function stubbedLogstashFields() {
  return [
    //                                  |indexed
    //                                  |      |analyzed
    //                                  |      |      |sortable
    //                                  |      |      |      |filterable
    //                                  |      |      |      |      |aggregatable
    //                                  |      |      |      |      |     |searchable
    // name                type         |      |      |      |      |     |      |metadata
    ['bytes',             'number',     true,  true,  true,  true,  true, true,  { count: 10 } ],
    ['ssl',               'boolean',    true,  true,  true,  true,  true, true,  { count: 20 } ],
    ['@timestamp',        'date',       true,  true,  true,  true,  true, true,  { count: 30 } ],
    ['time',              'date',       true,  true,  true,  true,  true, true,  { count: 30 } ],
    ['@tags',             'string',     true,  true,  true,  true,  true, true ],
    ['utc_time',          'date',       true,  true,  true,  true,  true, true ],
    ['phpmemory',         'number',     true,  true,  true,  true,  true, true ],
    ['ip',                'ip',         true,  true,  true,  true,  true, true ],
    ['request_body',      'attachment', true,  true,  false, true,  true, true ],
    ['point',             'geo_point',  true,  true,  false, false, true, true ],
    ['area',              'geo_shape',  true,  true,  true,  false, true, true ],
    ['hashed',            'murmur3',    true,  true,  false, false, true, true ],
    ['geo.coordinates',   'geo_point',  true,  true,  false, true,  true, true ],
    ['extension',         'string',     true,  true,  true,  true,  true, true ],
    ['machine.os',        'string',     true,  true,  true,  true,  true, true ],
    ['geo.src',           'string',     true,  true,  true,  true,  true, true ],
    ['_id',               'string',     false, false, false, true,  true, true ],
    ['_type',             'string',     false, false, false, true,  true, true ],
    ['_source',           'string',     false, false, false, false, true, true ],
    ['custom_user_field', 'conflict',   false, false, false, true,  true, true ],
    ['script string',     'string',     false, false, true,  true,  true, false, { script: '\'i am a string\'' } ],
    ['script number',     'number',     false, false, true,  true,  true, false, { script: '1234' } ],
    ['script date',       'date',       false, false, true,  true,  true, false, { script: '1234', lang: 'painless' } ],
    ['script murmur3',    'murmur3',    false, false, true,  true,  true, false, { script: '1234' } ],
  ].map(function (row) {
    const [
      name,
      type,
      indexed,
      analyzed,
      sortable,
      filterable,
      aggregatable,
      searchable,
      metadata = {}
    ] = row;

    const {
      count = 0,
      script,
      lang = script ? 'expression' : undefined,
      scripted = !!script,
    } = metadata;

    return {
      name,
      type,
      indexed,
      analyzed,
      sortable,
      filterable,
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
