export const relatedEcs = {
  hash: {
    dashed_name: 'related-hash',
    description: "All the hashes seen on your event. Populating this field, then using it to search for hashes can help in situations where you're unsure what the hash algorithm is (and therefore which key name to search).",
    flat_name: 'related.hash',
    ignore_above: 1024,
    level: 'extended',
    name: 'hash',
    normalize: [ 'array' ],
    short: 'All the hashes seen on your event.',
    type: 'keyword'
  },
  hosts: {
    dashed_name: 'related-hosts',
    description: 'All hostnames or other host identifiers seen on your event. Example identifiers include FQDNs, domain names, workstation names, or aliases.',
    flat_name: 'related.hosts',
    ignore_above: 1024,
    level: 'extended',
    name: 'hosts',
    normalize: [ 'array' ],
    short: 'All the host identifiers seen on your event.',
    type: 'keyword'
  },
  ip: {
    dashed_name: 'related-ip',
    description: 'All of the IPs seen on your event.',
    flat_name: 'related.ip',
    level: 'extended',
    name: 'ip',
    normalize: [ 'array' ],
    short: 'All of the IPs seen on your event.',
    type: 'ip'
  },
  user: {
    dashed_name: 'related-user',
    description: 'All the user names or other user identifiers seen on the event.',
    flat_name: 'related.user',
    ignore_above: 1024,
    level: 'extended',
    name: 'user',
    normalize: [ 'array' ],
    short: 'All the user names or other user identifiers seen on the event.',
    type: 'keyword'
  }
}