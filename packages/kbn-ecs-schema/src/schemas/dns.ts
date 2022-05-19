export const dnsEcs = {
  answers: {
    dashed_name: 'dns-answers',
    description: 'An array containing an object for each answer section returned by the server.\n' +
      'The main keys that should be present in these objects are defined by ECS. Records that have more information may contain more keys than what ECS defines.\n' +
      'Not all DNS data sources give all details about DNS answers. At minimum, answer objects must contain the `data` key. If more information is available, map as much of it to ECS as possible, and add any additional fields to the answer objects as custom fields.',
    flat_name: 'dns.answers',
    level: 'extended',
    name: {
      dashed_name: 'dns-answers-name',
      description: 'The domain name to which this resource record pertains.\n' +
        "If a chain of CNAME is being resolved, each answer's `name` should be the one that corresponds with the answer's `data`. It should not simply be the original `question.name` repeated.",
      example: 'www.example.com',
      flat_name: 'dns.answers.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'answers.name',
      normalize: [],
      short: 'The domain name to which this resource record pertains.',
      type: 'keyword'
    },
    normalize: [ 'array' ],
    short: 'Array of DNS answers.',
    type: {
      dashed_name: 'dns-answers-type',
      description: 'The type of data contained in this resource record.',
      example: 'CNAME',
      flat_name: 'dns.answers.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'answers.type',
      normalize: [],
      short: 'The type of data contained in this resource record.',
      type: 'keyword'
    },
    class: {
      dashed_name: 'dns-answers-class',
      description: 'The class of DNS data contained in this resource record.',
      example: 'IN',
      flat_name: 'dns.answers.class',
      ignore_above: 1024,
      level: 'extended',
      name: 'answers.class',
      normalize: [],
      short: 'The class of DNS data contained in this resource record.',
      type: 'keyword'
    },
    data: {
      dashed_name: 'dns-answers-data',
      description: 'The data describing the resource.\n' +
        'The meaning of this data depends on the type and class of the resource record.',
      example: '10.10.10.10',
      flat_name: 'dns.answers.data',
      ignore_above: 1024,
      level: 'extended',
      name: 'answers.data',
      normalize: [],
      short: 'The data describing the resource.',
      type: 'keyword'
    },
    ttl: {
      dashed_name: 'dns-answers-ttl',
      description: 'The time interval in seconds that this resource record may be cached before it should be discarded. Zero values mean that the data should not be cached.',
      example: 180,
      flat_name: 'dns.answers.ttl',
      level: 'extended',
      name: 'answers.ttl',
      normalize: [],
      short: 'The time interval in seconds that this resource record may be cached before it should be discarded.',
      type: 'long'
    }
  },
  header_flags: {
    dashed_name: 'dns-header-flags',
    description: 'Array of 2 letter DNS header flags.\n' +
      'Expected values are: AA, TC, RD, RA, AD, CD, DO.',
    example: '["RD", "RA"]',
    flat_name: 'dns.header_flags',
    ignore_above: 1024,
    level: 'extended',
    name: 'header_flags',
    normalize: [ 'array' ],
    short: 'Array of DNS header flags.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'dns-id',
    description: 'The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.',
    example: 62111,
    flat_name: 'dns.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.',
    type: 'keyword'
  },
  op_code: {
    dashed_name: 'dns-op-code',
    description: 'The DNS operation code that specifies the kind of query in the message. This value is set by the originator of a query and copied into the response.',
    example: 'QUERY',
    flat_name: 'dns.op_code',
    ignore_above: 1024,
    level: 'extended',
    name: 'op_code',
    normalize: [],
    short: 'The DNS operation code that specifies the kind of query in the message.',
    type: 'keyword'
  },
  question: {
    class: {
      dashed_name: 'dns-question-class',
      description: 'The class of records being queried.',
      example: 'IN',
      flat_name: 'dns.question.class',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.class',
      normalize: [],
      short: 'The class of records being queried.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'dns-question-name',
      description: 'The name being queried.\n' +
        'If the name field contains non-printable characters (below 32 or above 126), those characters should be represented as escaped base 10 integers (\\DDD). Back slashes and quotes should be escaped. Tabs, carriage returns, and line feeds should be converted to \\t, \\r, and \\n respectively.',
      example: 'www.example.com',
      flat_name: 'dns.question.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.name',
      normalize: [],
      short: 'The name being queried.',
      type: 'keyword'
    },
    registered_domain: {
      dashed_name: 'dns-question-registered-domain',
      description: 'The highest registered domain, stripped of the subdomain.\n' +
        'For example, the registered domain for "foo.example.com" is "example.com".\n' +
        'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".',
      example: 'example.com',
      flat_name: 'dns.question.registered_domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.registered_domain',
      normalize: [],
      short: 'The highest registered domain, stripped of the subdomain.',
      type: 'keyword'
    },
    subdomain: {
      dashed_name: 'dns-question-subdomain',
      description: 'The subdomain is all of the labels under the registered_domain.\n' +
        'If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.',
      example: 'www',
      flat_name: 'dns.question.subdomain',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.subdomain',
      normalize: [],
      short: 'The subdomain of the domain.',
      type: 'keyword'
    },
    top_level_domain: {
      dashed_name: 'dns-question-top-level-domain',
      description: 'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".\n' +
        'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".',
      example: 'co.uk',
      flat_name: 'dns.question.top_level_domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.top_level_domain',
      normalize: [],
      short: 'The effective top level domain (com, org, net, co.uk).',
      type: 'keyword'
    },
    type: {
      dashed_name: 'dns-question-type',
      description: 'The type of record being queried.',
      example: 'AAAA',
      flat_name: 'dns.question.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'question.type',
      normalize: [],
      short: 'The type of record being queried.',
      type: 'keyword'
    }
  },
  resolved_ip: {
    dashed_name: 'dns-resolved-ip',
    description: 'Array containing all IPs seen in `answers.data`.\n' +
      'The `answers` array can be difficult to use, because of the variety of data formats it can contain. Extracting all IP addresses seen in there to `dns.resolved_ip` makes it possible to index them as IP addresses, and makes them easier to visualize and query for.',
    example: '["10.10.10.10", "10.10.10.11"]',
    flat_name: 'dns.resolved_ip',
    level: 'extended',
    name: 'resolved_ip',
    normalize: [ 'array' ],
    short: 'Array containing all IPs seen in answers.data',
    type: 'ip'
  },
  response_code: {
    dashed_name: 'dns-response-code',
    description: 'The DNS response code.',
    example: 'NOERROR',
    flat_name: 'dns.response_code',
    ignore_above: 1024,
    level: 'extended',
    name: 'response_code',
    normalize: [],
    short: 'The DNS response code.',
    type: 'keyword'
  },
  type: {
    dashed_name: 'dns-type',
    description: 'The type of DNS event captured, query or answer.\n' +
      'If your source of DNS events only gives you DNS queries, you should only create dns events of type `dns.type:query`.\n' +
      'If your source of DNS events gives you answers as well, you should create one event per query (optionally as soon as the query is seen). And a second event containing all query details as well as an array of answers.',
    example: 'answer',
    flat_name: 'dns.type',
    ignore_above: 1024,
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'The type of DNS event captured, query or answer.',
    type: 'keyword'
  }
}