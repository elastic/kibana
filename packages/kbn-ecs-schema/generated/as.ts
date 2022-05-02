export const asEcs = {
  number: {
    dashed_name: 'as-number',
    description: 'Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.',
    example: 15169,
    flat_name: 'as.number',
    level: 'extended',
    name: 'number',
    normalize: [],
    short: 'Unique number allocated to the autonomous system.',
    type: 'long'
  },
  organization: {
    name: {
      dashed_name: 'as-organization-name',
      description: 'Organization name.',
      example: 'Google LLC',
      flat_name: 'as.organization.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'organization.name',
      normalize: [],
      short: 'Organization name.',
      type: 'keyword'
    }
  }
}