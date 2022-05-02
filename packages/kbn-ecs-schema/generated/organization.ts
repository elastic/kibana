export const organizationEcs = {
  id: {
    dashed_name: 'organization-id',
    description: 'Unique identifier for the organization.',
    flat_name: 'organization.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'Unique identifier for the organization.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'organization-name',
    description: 'Organization name.',
    flat_name: 'organization.name',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'name',
    normalize: [],
    short: 'Organization name.',
    type: 'keyword'
  }
}