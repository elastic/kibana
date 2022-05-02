export const ruleEcs = {
  author: {
    dashed_name: 'rule-author',
    description: 'Name, organization, or pseudonym of the author or authors who created the rule used to generate this event.',
    example: '["Star-Lord"]',
    flat_name: 'rule.author',
    ignore_above: 1024,
    level: 'extended',
    name: 'author',
    normalize: [ 'array' ],
    short: 'Rule author',
    type: 'keyword'
  },
  category: {
    dashed_name: 'rule-category',
    description: 'A categorization value keyword used by the entity using the rule for detection of this event.',
    example: 'Attempted Information Leak',
    flat_name: 'rule.category',
    ignore_above: 1024,
    level: 'extended',
    name: 'category',
    normalize: [],
    short: 'Rule category',
    type: 'keyword'
  },
  description: {
    dashed_name: 'rule-description',
    description: 'The description of the rule generating the event.',
    example: 'Block requests to public DNS over HTTPS / TLS protocols',
    flat_name: 'rule.description',
    ignore_above: 1024,
    level: 'extended',
    name: 'description',
    normalize: [],
    short: 'Rule description',
    type: 'keyword'
  },
  id: {
    dashed_name: 'rule-id',
    description: 'A rule ID that is unique within the scope of an agent, observer, or other entity using the rule for detection of this event.',
    example: 101,
    flat_name: 'rule.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'Rule ID',
    type: 'keyword'
  },
  license: {
    dashed_name: 'rule-license',
    description: 'Name of the license under which the rule used to generate this event is made available.',
    example: 'Apache 2.0',
    flat_name: 'rule.license',
    ignore_above: 1024,
    level: 'extended',
    name: 'license',
    normalize: [],
    short: 'Rule license',
    type: 'keyword'
  },
  name: {
    dashed_name: 'rule-name',
    description: 'The name of the rule or signature generating the event.',
    example: 'BLOCK_DNS_over_TLS',
    flat_name: 'rule.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Rule name',
    type: 'keyword'
  },
  reference: {
    dashed_name: 'rule-reference',
    description: 'Reference URL to additional information about the rule used to generate this event.\n' +
      "The URL can point to the vendor's documentation about the rule. If that's not available, it can also be a link to a more general page describing this type of alert.",
    example: 'https://en.wikipedia.org/wiki/DNS_over_TLS',
    flat_name: 'rule.reference',
    ignore_above: 1024,
    level: 'extended',
    name: 'reference',
    normalize: [],
    short: 'Rule reference URL',
    type: 'keyword'
  },
  ruleset: {
    dashed_name: 'rule-ruleset',
    description: 'Name of the ruleset, policy, group, or parent category in which the rule used to generate this event is a member.',
    example: 'Standard_Protocol_Filters',
    flat_name: 'rule.ruleset',
    ignore_above: 1024,
    level: 'extended',
    name: 'ruleset',
    normalize: [],
    short: 'Rule ruleset',
    type: 'keyword'
  },
  uuid: {
    dashed_name: 'rule-uuid',
    description: 'A rule ID that is unique within the scope of a set or group of agents, observers, or other entities using the rule for detection of this event.',
    example: 1100110011,
    flat_name: 'rule.uuid',
    ignore_above: 1024,
    level: 'extended',
    name: 'uuid',
    normalize: [],
    short: 'Rule UUID',
    type: 'keyword'
  },
  version: {
    dashed_name: 'rule-version',
    description: 'The version / revision of the rule being used for analysis.',
    example: 1.1,
    flat_name: 'rule.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'Rule version',
    type: 'keyword'
  }
}