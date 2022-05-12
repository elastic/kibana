export const vlanEcs = {
  id: {
    dashed_name: 'vlan-id',
    description: 'VLAN ID as reported by the observer.',
    example: 10,
    flat_name: 'vlan.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'VLAN ID as reported by the observer.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'vlan-name',
    description: 'Optional VLAN name as reported by the observer.',
    example: 'outside',
    flat_name: 'vlan.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Optional VLAN name as reported by the observer.',
    type: 'keyword'
  }
}