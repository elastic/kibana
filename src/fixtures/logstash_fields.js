import { castEsToKbnFieldTypeName } from '../utils';

function stubbedLogstashFields() {
  return [
    //                                  |indexed
    //                                  |      |analyzed
    //                                  |      |      |aggregatable
    //                                  |      |      |      |searchable
    // name               esType        |      |      |      |     |metadata
    ['bytes',             'long',       true,  true,  true,  true,  { count: 10, docValues: true } ],
    ['ssl',               'boolean',    true,  true,  true,  true,  { count: 20 } ],
    ['@timestamp',        'date',       true,  true,  true,  true,  { count: 30 } ],
    ['time',              'date',       true,  true,  true,  true,  { count: 30 } ],
    ['@tags',             'keyword',    true,  true,  true,  true ],
    ['utc_time',          'date',       true,  true,  true,  true ],
    ['phpmemory',         'integer',    true,  true,  true,  true ],
    ['ip',                'ip',         true,  true,  true,  true ],
    ['request_body',      'attachment', true,  true,  true,  true ],
    ['point',             'geo_point',  true,  true,  true,  true ],
    ['area',              'geo_shape',  true,  true,  true,  true ],
    ['hashed',            'murmur3',    true,  true,  false, true ],
    ['geo.coordinates',   'geo_point',  true,  true,  true,  true ],
    ['extension',         'keyword',    true,  true,  true,  true ],
    ['machine.os',        'text',       true,  true,  true,  true ],
    ['machine.os.raw',    'keyword',    true,  false, true,  true,  { docValues: true } ],
    ['geo.src',           'keyword',    true,  true,  true,  true ],
    ['_id',               'keyword',    false, false, true,  true ],
    ['_type',             'keyword',    false, false, true,  true ],
    ['_source',           'keyword',    false, false, true,  true ],
    ['non-filterable',    'text',       false, false, true,  false],
    ['non-sortable',      'text',       false, false, false, false],
    ['custom_user_field', 'conflict',   false, false, true,  true ],
    ['script string',     'text',       false, false, true,  false, { script: '\'i am a string\'' } ],
    ['script number',     'long',       false, false, true,  false, { script: '1234' } ],
    ['script date',       'date',       false, false, true,  false, { script: '1234', lang: 'painless' } ],
    ['script murmur3',    'murmur3',    false, false, true,  false, { script: '1234' } ],
    ['meta string',       'string',     false, false, true,  false, { meta: true }],
    ['meta number',       'number',     false, false, true,  false, { meta: true }],
    ['meta date',         'date',       false, false, true,  false, { meta: true }],
    ['meta murmur3',      'murmur3',    false, false, true,  false, { meta: true }],
  ].map(function (row) {
    const [
      name,
      esType,
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

    // the conflict type is actually a kbnFieldType, we
    // don't have any other way to represent it here
    const type = esType === 'conflict' ? esType : castEsToKbnFieldTypeName(esType);

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
