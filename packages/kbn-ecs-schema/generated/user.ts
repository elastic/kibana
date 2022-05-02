export const userEcs = {
  changes: {
    domain: {
      dashed_name: 'user-changes-domain',
      description: 'Name of the directory the user is a member of.\n' +
        'For example, an LDAP or Active Directory domain name.',
      flat_name: 'user.changes.domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'domain',
      normalize: [],
      original_fieldset: 'user',
      short: 'Name of the directory the user is a member of.',
      type: 'keyword'
    },
    email: {
      dashed_name: 'user-changes-email',
      description: 'User email address.',
      flat_name: 'user.changes.email',
      ignore_above: 1024,
      level: 'extended',
      name: 'email',
      normalize: [],
      original_fieldset: 'user',
      short: 'User email address.',
      type: 'keyword'
    },
    full_name: {
      dashed_name: 'user-changes-full-name',
      description: "User's full name, if available.",
      example: 'Albert Einstein',
      flat_name: 'user.changes.full_name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'full_name',
      normalize: [],
      original_fieldset: 'user',
      short: "User's full name, if available.",
      type: 'keyword'
    },
    group: { domain: [Object], id: [Object], name: [Object] },
    hash: {
      dashed_name: 'user-changes-hash',
      description: 'Unique user hash to correlate information for a user in anonymized form.\n' +
        'Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
      flat_name: 'user.changes.hash',
      ignore_above: 1024,
      level: 'extended',
      name: 'hash',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique user hash to correlate information for a user in anonymized form.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'user-changes-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'user.changes.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'user-changes-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'user.changes.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [Array],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    },
    roles: {
      dashed_name: 'user-changes-roles',
      description: 'Array of user roles at the time of the event.',
      example: '["kibana_admin", "reporting_user"]',
      flat_name: 'user.changes.roles',
      ignore_above: 1024,
      level: 'extended',
      name: 'roles',
      normalize: [Array],
      original_fieldset: 'user',
      short: 'Array of user roles at the time of the event.',
      type: 'keyword'
    }
  },
  domain: {
    dashed_name: 'user-domain',
    description: 'Name of the directory the user is a member of.\n' +
      'For example, an LDAP or Active Directory domain name.',
    flat_name: 'user.domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'domain',
    normalize: [],
    short: 'Name of the directory the user is a member of.',
    type: 'keyword'
  },
  effective: {
    domain: {
      dashed_name: 'user-effective-domain',
      description: 'Name of the directory the user is a member of.\n' +
        'For example, an LDAP or Active Directory domain name.',
      flat_name: 'user.effective.domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'domain',
      normalize: [],
      original_fieldset: 'user',
      short: 'Name of the directory the user is a member of.',
      type: 'keyword'
    },
    email: {
      dashed_name: 'user-effective-email',
      description: 'User email address.',
      flat_name: 'user.effective.email',
      ignore_above: 1024,
      level: 'extended',
      name: 'email',
      normalize: [],
      original_fieldset: 'user',
      short: 'User email address.',
      type: 'keyword'
    },
    full_name: {
      dashed_name: 'user-effective-full-name',
      description: "User's full name, if available.",
      example: 'Albert Einstein',
      flat_name: 'user.effective.full_name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'full_name',
      normalize: [],
      original_fieldset: 'user',
      short: "User's full name, if available.",
      type: 'keyword'
    },
    group: { domain: [Object], id: [Object], name: [Object] },
    hash: {
      dashed_name: 'user-effective-hash',
      description: 'Unique user hash to correlate information for a user in anonymized form.\n' +
        'Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
      flat_name: 'user.effective.hash',
      ignore_above: 1024,
      level: 'extended',
      name: 'hash',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique user hash to correlate information for a user in anonymized form.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'user-effective-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'user.effective.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'user-effective-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'user.effective.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [Array],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    },
    roles: {
      dashed_name: 'user-effective-roles',
      description: 'Array of user roles at the time of the event.',
      example: '["kibana_admin", "reporting_user"]',
      flat_name: 'user.effective.roles',
      ignore_above: 1024,
      level: 'extended',
      name: 'roles',
      normalize: [Array],
      original_fieldset: 'user',
      short: 'Array of user roles at the time of the event.',
      type: 'keyword'
    }
  },
  email: {
    dashed_name: 'user-email',
    description: 'User email address.',
    flat_name: 'user.email',
    ignore_above: 1024,
    level: 'extended',
    name: 'email',
    normalize: [],
    short: 'User email address.',
    type: 'keyword'
  },
  full_name: {
    dashed_name: 'user-full-name',
    description: "User's full name, if available.",
    example: 'Albert Einstein',
    flat_name: 'user.full_name',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'full_name',
    normalize: [],
    short: "User's full name, if available.",
    type: 'keyword'
  },
  group: {
    domain: {
      dashed_name: 'user-group-domain',
      description: 'Name of the directory the group is a member of.\n' +
        'For example, an LDAP or Active Directory domain name.',
      flat_name: 'user.group.domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'domain',
      normalize: [],
      original_fieldset: 'group',
      short: 'Name of the directory the group is a member of.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'user-group-id',
      description: 'Unique identifier for the group on the system/platform.',
      flat_name: 'user.group.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'id',
      normalize: [],
      original_fieldset: 'group',
      short: 'Unique identifier for the group on the system/platform.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'user-group-name',
      description: 'Name of the group.',
      flat_name: 'user.group.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'group',
      short: 'Name of the group.',
      type: 'keyword'
    }
  },
  hash: {
    dashed_name: 'user-hash',
    description: 'Unique user hash to correlate information for a user in anonymized form.\n' +
      'Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
    flat_name: 'user.hash',
    ignore_above: 1024,
    level: 'extended',
    name: 'hash',
    normalize: [],
    short: 'Unique user hash to correlate information for a user in anonymized form.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'user-id',
    description: 'Unique identifier of the user.',
    example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
    flat_name: 'user.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique identifier of the user.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'user-name',
    description: 'Short name or login of the user.',
    example: 'a.einstein',
    flat_name: 'user.name',
    ignore_above: 1024,
    level: 'core',
    multi_fields: [ [Object] ],
    name: 'name',
    normalize: [],
    short: 'Short name or login of the user.',
    type: 'keyword'
  },
  roles: {
    dashed_name: 'user-roles',
    description: 'Array of user roles at the time of the event.',
    example: '["kibana_admin", "reporting_user"]',
    flat_name: 'user.roles',
    ignore_above: 1024,
    level: 'extended',
    name: 'roles',
    normalize: [ 'array' ],
    short: 'Array of user roles at the time of the event.',
    type: 'keyword'
  },
  target: {
    domain: {
      dashed_name: 'user-target-domain',
      description: 'Name of the directory the user is a member of.\n' +
        'For example, an LDAP or Active Directory domain name.',
      flat_name: 'user.target.domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'domain',
      normalize: [],
      original_fieldset: 'user',
      short: 'Name of the directory the user is a member of.',
      type: 'keyword'
    },
    email: {
      dashed_name: 'user-target-email',
      description: 'User email address.',
      flat_name: 'user.target.email',
      ignore_above: 1024,
      level: 'extended',
      name: 'email',
      normalize: [],
      original_fieldset: 'user',
      short: 'User email address.',
      type: 'keyword'
    },
    full_name: {
      dashed_name: 'user-target-full-name',
      description: "User's full name, if available.",
      example: 'Albert Einstein',
      flat_name: 'user.target.full_name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'full_name',
      normalize: [],
      original_fieldset: 'user',
      short: "User's full name, if available.",
      type: 'keyword'
    },
    group: { domain: [Object], id: [Object], name: [Object] },
    hash: {
      dashed_name: 'user-target-hash',
      description: 'Unique user hash to correlate information for a user in anonymized form.\n' +
        'Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
      flat_name: 'user.target.hash',
      ignore_above: 1024,
      level: 'extended',
      name: 'hash',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique user hash to correlate information for a user in anonymized form.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'user-target-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'user.target.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'user-target-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'user.target.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [Array],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    },
    roles: {
      dashed_name: 'user-target-roles',
      description: 'Array of user roles at the time of the event.',
      example: '["kibana_admin", "reporting_user"]',
      flat_name: 'user.target.roles',
      ignore_above: 1024,
      level: 'extended',
      name: 'roles',
      normalize: [Array],
      original_fieldset: 'user',
      short: 'Array of user roles at the time of the event.',
      type: 'keyword'
    }
  }
}