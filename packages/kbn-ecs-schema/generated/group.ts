export const groupEcs = {
  domain: {
    dashed_name: 'group-domain',
    description: 'Name of the directory the group is a member of.\n' +
      'For example, an LDAP or Active Directory domain name.',
    flat_name: 'group.domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'domain',
    normalize: [],
    short: 'Name of the directory the group is a member of.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'group-id',
    description: 'Unique identifier for the group on the system/platform.',
    flat_name: 'group.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'Unique identifier for the group on the system/platform.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'group-name',
    description: 'Name of the group.',
    flat_name: 'group.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Name of the group.',
    type: 'keyword'
  }
}