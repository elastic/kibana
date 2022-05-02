export const networkEcs = {
  application: {
    dashed_name: 'network-application',
    description: "When a specific application or service is identified from network connection details (source/dest IPs, ports, certificates, or wire format), this field captures the application's or service's name.\n" +
      'For example, the original event identifies the network connection being from a specific web service in a `https` network connection, like `facebook` or `twitter`.\n' +
      'The field value must be normalized to lowercase for querying.',
    example: 'aim',
    flat_name: 'network.application',
    ignore_above: 1024,
    level: 'extended',
    name: 'application',
    normalize: [],
    short: 'Application level protocol name.',
    type: 'keyword'
  },
  bytes: {
    dashed_name: 'network-bytes',
    description: 'Total bytes transferred in both directions.\n' +
      'If `source.bytes` and `destination.bytes` are known, `network.bytes` is their sum.',
    example: 368,
    flat_name: 'network.bytes',
    format: 'bytes',
    level: 'core',
    name: 'bytes',
    normalize: [],
    short: 'Total bytes transferred in both directions.',
    type: 'long'
  },
  community_id: {
    dashed_name: 'network-community-id',
    description: 'A hash of source and destination IPs and ports, as well as the protocol used in a communication. This is a tool-agnostic standard to identify flows.\n' +
      'Learn more at https://github.com/corelight/community-id-spec.',
    example: '1:hO+sN4H+MG5MY/8hIrXPqc4ZQz0=',
    flat_name: 'network.community_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'community_id',
    normalize: [],
    short: 'A hash of source and destination IPs and ports.',
    type: 'keyword'
  },
  direction: {
    dashed_name: 'network-direction',
    description: 'Direction of the network traffic.\n' +
      'Recommended values are:\n' +
      '  * ingress\n' +
      '  * egress\n' +
      '  * inbound\n' +
      '  * outbound\n' +
      '  * internal\n' +
      '  * external\n' +
      '  * unknown\n' +
      '\n' +
      `When mapping events from a host-based monitoring context, populate this field from the host's point of view, using the values "ingress" or "egress".\n` +
      'When mapping events from a network or perimeter-based monitoring context, populate this field from the point of view of the network perimeter, using the values "inbound", "outbound", "internal" or "external".\n' +
      'Note that "internal" is not crossing perimeter boundaries, and is meant to describe communication between two hosts within the perimeter. Note also that "external" is meant to describe traffic between two hosts that are external to the perimeter. This could for example be useful for ISPs or VPN service providers.',
    example: 'inbound',
    flat_name: 'network.direction',
    ignore_above: 1024,
    level: 'core',
    name: 'direction',
    normalize: [],
    short: 'Direction of the network traffic.',
    type: 'keyword'
  },
  forwarded_ip: {
    dashed_name: 'network-forwarded-ip',
    description: 'Host IP address when the source IP address is the proxy.',
    example: '192.1.1.2',
    flat_name: 'network.forwarded_ip',
    level: 'core',
    name: 'forwarded_ip',
    normalize: [],
    short: 'Host IP address when the source IP address is the proxy.',
    type: 'ip'
  },
  iana_number: {
    dashed_name: 'network-iana-number',
    description: 'IANA Protocol Number (https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). Standardized list of protocols. This aligns well with NetFlow and sFlow related logs which use the IANA Protocol Number.',
    example: 6,
    flat_name: 'network.iana_number',
    ignore_above: 1024,
    level: 'extended',
    name: 'iana_number',
    normalize: [],
    short: 'IANA Protocol Number.',
    type: 'keyword'
  },
  inner: {
    dashed_name: 'network-inner',
    description: 'Network.inner fields are added in addition to network.vlan fields to describe the innermost VLAN when q-in-q VLAN tagging is present. Allowed fields include vlan.id and vlan.name. Inner vlan fields are typically used when sending traffic with multiple 802.1q encapsulations to a network sensor (e.g. Zeek, Wireshark.)',
    flat_name: 'network.inner',
    level: 'extended',
    name: 'inner',
    normalize: [],
    short: 'Inner VLAN tag information',
    type: 'object',
    vlan: { id: [Object], name: [Object] }
  },
  name: {
    dashed_name: 'network-name',
    description: 'Name given by operators to sections of their network.',
    example: 'Guest Wifi',
    flat_name: 'network.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Name given by operators to sections of their network.',
    type: 'keyword'
  },
  packets: {
    dashed_name: 'network-packets',
    description: 'Total packets transferred in both directions.\n' +
      'If `source.packets` and `destination.packets` are known, `network.packets` is their sum.',
    example: 24,
    flat_name: 'network.packets',
    level: 'core',
    name: 'packets',
    normalize: [],
    short: 'Total packets transferred in both directions.',
    type: 'long'
  },
  protocol: {
    dashed_name: 'network-protocol',
    description: 'In the OSI Model this would be the Application Layer protocol. For example, `http`, `dns`, or `ssh`.\n' +
      'The field value must be normalized to lowercase for querying.',
    example: 'http',
    flat_name: 'network.protocol',
    ignore_above: 1024,
    level: 'core',
    name: 'protocol',
    normalize: [],
    short: 'Application protocol name.',
    type: 'keyword'
  },
  transport: {
    dashed_name: 'network-transport',
    description: 'Same as network.iana_number, but instead using the Keyword name of the transport layer (udp, tcp, ipv6-icmp, etc.)\n' +
      'The field value must be normalized to lowercase for querying.',
    example: 'tcp',
    flat_name: 'network.transport',
    ignore_above: 1024,
    level: 'core',
    name: 'transport',
    normalize: [],
    short: 'Protocol Name corresponding to the field `iana_number`.',
    type: 'keyword'
  },
  type: {
    dashed_name: 'network-type',
    description: 'In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc\n' +
      'The field value must be normalized to lowercase for querying.',
    example: 'ipv4',
    flat_name: 'network.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [],
    short: 'In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc',
    type: 'keyword'
  },
  vlan: {
    id: {
      dashed_name: 'network-vlan-id',
      description: 'VLAN ID as reported by the observer.',
      example: 10,
      flat_name: 'network.vlan.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'id',
      normalize: [],
      original_fieldset: 'vlan',
      short: 'VLAN ID as reported by the observer.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'network-vlan-name',
      description: 'Optional VLAN name as reported by the observer.',
      example: 'outside',
      flat_name: 'network.vlan.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'vlan',
      short: 'Optional VLAN name as reported by the observer.',
      type: 'keyword'
    }
  }
}