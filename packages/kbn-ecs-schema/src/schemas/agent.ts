export const agentEcs = {
  build: {
    original: {
      dashed_name: 'agent-build-original',
      description: 'Extended build information for the agent.\n' +
        'This field is intended to contain any build information that a data source may provide, no specific formatting is required.',
      example: 'metricbeat version 7.6.0 (amd64), libbeat 7.6.0 [6a23e8f8f30f5001ba344e4e54d8d9cb82cb107c built 2020-02-05 23:10:10 +0000 UTC]',
      flat_name: 'agent.build.original',
      ignore_above: 1024,
      level: 'core',
      name: 'build.original',
      normalize: [],
      short: 'Extended build information for the agent.',
      type: 'keyword'
    }
  },
  ephemeral_id: {
    dashed_name: 'agent-ephemeral-id',
    description: 'Ephemeral identifier of this agent (if one exists).\n' +
      'This id normally changes across restarts, but `agent.id` does not.',
    example: '8a4f500f',
    flat_name: 'agent.ephemeral_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'ephemeral_id',
    normalize: [],
    short: 'Ephemeral identifier of this agent.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'agent-id',
    description: 'Unique identifier of this agent (if one exists).\n' +
      'Example: For Beats this would be beat.id.',
    example: '8a4f500d',
    flat_name: 'agent.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique identifier of this agent.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'agent-name',
    description: 'Custom name of the agent.\n' +
      'This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from.\n' +
      'If no name is given, the name is often left empty.',
    example: 'foo',
    flat_name: 'agent.name',
    ignore_above: 1024,
    level: 'core',
    name: 'name',
    normalize: [],
    short: 'Custom name of the agent.',
    type: 'keyword'
  },
  type: {
    dashed_name: 'agent-type',
    description: 'Type of the agent.\n' +
      'The agent type always stays the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
    example: 'filebeat',
    flat_name: 'agent.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [],
    short: 'Type of the agent.',
    type: 'keyword'
  },
  version: {
    dashed_name: 'agent-version',
    description: 'Version of the agent.',
    example: '6.0.0-rc2',
    flat_name: 'agent.version',
    ignore_above: 1024,
    level: 'core',
    name: 'version',
    normalize: [],
    short: 'Version of the agent.',
    type: 'keyword'
  }
}