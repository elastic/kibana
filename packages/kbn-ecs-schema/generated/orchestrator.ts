export const orchestratorEcs = {
  api_version: {
    dashed_name: 'orchestrator-api-version',
    description: 'API version being used to carry out the action',
    example: 'v1beta1',
    flat_name: 'orchestrator.api_version',
    ignore_above: 1024,
    level: 'extended',
    name: 'api_version',
    normalize: [],
    short: 'API version being used to carry out the action',
    type: 'keyword'
  },
  cluster: {
    name: {
      dashed_name: 'orchestrator-cluster-name',
      description: 'Name of the cluster.',
      flat_name: 'orchestrator.cluster.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'cluster.name',
      normalize: [],
      short: 'Name of the cluster.',
      type: 'keyword'
    },
    url: {
      dashed_name: 'orchestrator-cluster-url',
      description: 'URL of the API used to manage the cluster.',
      flat_name: 'orchestrator.cluster.url',
      ignore_above: 1024,
      level: 'extended',
      name: 'cluster.url',
      normalize: [],
      short: 'URL of the API used to manage the cluster.',
      type: 'keyword'
    },
    version: {
      dashed_name: 'orchestrator-cluster-version',
      description: 'The version of the cluster.',
      flat_name: 'orchestrator.cluster.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'cluster.version',
      normalize: [],
      short: 'The version of the cluster.',
      type: 'keyword'
    }
  },
  namespace: {
    dashed_name: 'orchestrator-namespace',
    description: 'Namespace in which the action is taking place.',
    example: 'kube-system',
    flat_name: 'orchestrator.namespace',
    ignore_above: 1024,
    level: 'extended',
    name: 'namespace',
    normalize: [],
    short: 'Namespace in which the action is taking place.',
    type: 'keyword'
  },
  organization: {
    dashed_name: 'orchestrator-organization',
    description: 'Organization affected by the event (for multi-tenant orchestrator setups).',
    example: 'elastic',
    flat_name: 'orchestrator.organization',
    ignore_above: 1024,
    level: 'extended',
    name: 'organization',
    normalize: [],
    short: 'Organization affected by the event (for multi-tenant orchestrator setups).',
    type: 'keyword'
  },
  resource: {
    name: {
      dashed_name: 'orchestrator-resource-name',
      description: 'Name of the resource being acted upon.',
      example: 'test-pod-cdcws',
      flat_name: 'orchestrator.resource.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'resource.name',
      normalize: [],
      short: 'Name of the resource being acted upon.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'orchestrator-resource-type',
      description: 'Type of resource being acted upon.',
      example: 'service',
      flat_name: 'orchestrator.resource.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'resource.type',
      normalize: [],
      short: 'Type of resource being acted upon.',
      type: 'keyword'
    }
  },
  type: {
    dashed_name: 'orchestrator-type',
    description: 'Orchestrator cluster type (e.g. kubernetes, nomad or cloudfoundry).',
    example: 'kubernetes',
    flat_name: 'orchestrator.type',
    ignore_above: 1024,
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'Orchestrator cluster type (e.g. kubernetes, nomad or cloudfoundry).',
    type: 'keyword'
  }
}