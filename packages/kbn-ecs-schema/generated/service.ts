export const serviceEcs = {
  address: {
    dashed_name: 'service-address',
    description: 'Address where data about this service was collected from.\n' +
      'This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).',
    example: '172.26.0.2:5432',
    flat_name: 'service.address',
    ignore_above: 1024,
    level: 'extended',
    name: 'address',
    normalize: [],
    short: 'Address of this service.',
    type: 'keyword'
  },
  environment: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'service-environment',
    description: 'Identifies the environment where the service is running.\n' +
      'If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.',
    example: 'production',
    flat_name: 'service.environment',
    ignore_above: 1024,
    level: 'extended',
    name: 'environment',
    normalize: [],
    short: 'Environment of the service.',
    type: 'keyword'
  },
  ephemeral_id: {
    dashed_name: 'service-ephemeral-id',
    description: 'Ephemeral identifier of this service (if one exists).\n' +
      'This id normally changes across restarts, but `service.id` does not.',
    example: '8a4f500f',
    flat_name: 'service.ephemeral_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'ephemeral_id',
    normalize: [],
    short: 'Ephemeral identifier of this service.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'service-id',
    description: 'Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.\n' +
      'This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.\n' +
      'Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.',
    example: 'd37e5ebfe0ae6c4972dbe9f0174a1637bb8247f6',
    flat_name: 'service.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique identifier of the running service.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'service-name',
    description: 'Name of the service data is collected from.\n' +
      'The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.\n' +
      'In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.',
    example: 'elasticsearch-metrics',
    flat_name: 'service.name',
    ignore_above: 1024,
    level: 'core',
    name: 'name',
    normalize: [],
    short: 'Name of the service.',
    type: 'keyword'
  },
  node: {
    name: {
      dashed_name: 'service-node-name',
      description: 'Name of a service node.\n' +
        'This allows for two nodes of the same service running on the same host to be differentiated. Therefore, `service.node.name` should typically be unique across nodes of a given service.\n' +
        "In the case of Elasticsearch, the `service.node.name` could contain the unique node name within the Elasticsearch cluster. In cases where the service doesn't have the concept of a node name, the host name or container name can be used to distinguish running instances that make up this service. If those do not provide uniqueness (e.g. multiple instances of the service running on the same host) - the node name can be manually set.",
      example: 'instance-0000000016',
      flat_name: 'service.node.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'node.name',
      normalize: [],
      short: 'Name of the service node.',
      type: 'keyword'
    }
  },
  origin: {
    address: {
      dashed_name: 'service-origin-address',
      description: 'Address where data about this service was collected from.\n' +
        'This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).',
      example: '172.26.0.2:5432',
      flat_name: 'service.origin.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'address',
      normalize: [],
      original_fieldset: 'service',
      short: 'Address of this service.',
      type: 'keyword'
    },
    environment: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'service-origin-environment',
      description: 'Identifies the environment where the service is running.\n' +
        'If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.',
      example: 'production',
      flat_name: 'service.origin.environment',
      ignore_above: 1024,
      level: 'extended',
      name: 'environment',
      normalize: [],
      original_fieldset: 'service',
      short: 'Environment of the service.',
      type: 'keyword'
    },
    ephemeral_id: {
      dashed_name: 'service-origin-ephemeral-id',
      description: 'Ephemeral identifier of this service (if one exists).\n' +
        'This id normally changes across restarts, but `service.id` does not.',
      example: '8a4f500f',
      flat_name: 'service.origin.ephemeral_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'ephemeral_id',
      normalize: [],
      original_fieldset: 'service',
      short: 'Ephemeral identifier of this service.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'service-origin-id',
      description: 'Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.\n' +
        'This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.\n' +
        'Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.',
      example: 'd37e5ebfe0ae6c4972dbe9f0174a1637bb8247f6',
      flat_name: 'service.origin.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'service',
      short: 'Unique identifier of the running service.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'service-origin-name',
      description: 'Name of the service data is collected from.\n' +
        'The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.\n' +
        'In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.',
      example: 'elasticsearch-metrics',
      flat_name: 'service.origin.name',
      ignore_above: 1024,
      level: 'core',
      name: 'name',
      normalize: [],
      original_fieldset: 'service',
      short: 'Name of the service.',
      type: 'keyword'
    },
    node: { name: [Object] },
    state: {
      dashed_name: 'service-origin-state',
      description: 'Current state of the service.',
      flat_name: 'service.origin.state',
      ignore_above: 1024,
      level: 'core',
      name: 'state',
      normalize: [],
      original_fieldset: 'service',
      short: 'Current state of the service.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'service-origin-type',
      description: 'The type of the service data is collected from.\n' +
        'The type can be used to group and correlate logs and metrics from one service type.\n' +
        'Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
      example: 'elasticsearch',
      flat_name: 'service.origin.type',
      ignore_above: 1024,
      level: 'core',
      name: 'type',
      normalize: [],
      original_fieldset: 'service',
      short: 'The type of the service.',
      type: 'keyword'
    },
    version: {
      dashed_name: 'service-origin-version',
      description: 'Version of the service the data was collected from.\n' +
        'This allows to look at a data set only for a specific version of a service.',
      example: '3.2.4',
      flat_name: 'service.origin.version',
      ignore_above: 1024,
      level: 'core',
      name: 'version',
      normalize: [],
      original_fieldset: 'service',
      short: 'Version of the service.',
      type: 'keyword'
    }
  },
  state: {
    dashed_name: 'service-state',
    description: 'Current state of the service.',
    flat_name: 'service.state',
    ignore_above: 1024,
    level: 'core',
    name: 'state',
    normalize: [],
    short: 'Current state of the service.',
    type: 'keyword'
  },
  target: {
    address: {
      dashed_name: 'service-target-address',
      description: 'Address where data about this service was collected from.\n' +
        'This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).',
      example: '172.26.0.2:5432',
      flat_name: 'service.target.address',
      ignore_above: 1024,
      level: 'extended',
      name: 'address',
      normalize: [],
      original_fieldset: 'service',
      short: 'Address of this service.',
      type: 'keyword'
    },
    environment: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'service-target-environment',
      description: 'Identifies the environment where the service is running.\n' +
        'If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.',
      example: 'production',
      flat_name: 'service.target.environment',
      ignore_above: 1024,
      level: 'extended',
      name: 'environment',
      normalize: [],
      original_fieldset: 'service',
      short: 'Environment of the service.',
      type: 'keyword'
    },
    ephemeral_id: {
      dashed_name: 'service-target-ephemeral-id',
      description: 'Ephemeral identifier of this service (if one exists).\n' +
        'This id normally changes across restarts, but `service.id` does not.',
      example: '8a4f500f',
      flat_name: 'service.target.ephemeral_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'ephemeral_id',
      normalize: [],
      original_fieldset: 'service',
      short: 'Ephemeral identifier of this service.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'service-target-id',
      description: 'Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.\n' +
        'This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.\n' +
        'Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.',
      example: 'd37e5ebfe0ae6c4972dbe9f0174a1637bb8247f6',
      flat_name: 'service.target.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'service',
      short: 'Unique identifier of the running service.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'service-target-name',
      description: 'Name of the service data is collected from.\n' +
        'The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.\n' +
        'In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.',
      example: 'elasticsearch-metrics',
      flat_name: 'service.target.name',
      ignore_above: 1024,
      level: 'core',
      name: 'name',
      normalize: [],
      original_fieldset: 'service',
      short: 'Name of the service.',
      type: 'keyword'
    },
    node: { name: [Object] },
    state: {
      dashed_name: 'service-target-state',
      description: 'Current state of the service.',
      flat_name: 'service.target.state',
      ignore_above: 1024,
      level: 'core',
      name: 'state',
      normalize: [],
      original_fieldset: 'service',
      short: 'Current state of the service.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'service-target-type',
      description: 'The type of the service data is collected from.\n' +
        'The type can be used to group and correlate logs and metrics from one service type.\n' +
        'Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
      example: 'elasticsearch',
      flat_name: 'service.target.type',
      ignore_above: 1024,
      level: 'core',
      name: 'type',
      normalize: [],
      original_fieldset: 'service',
      short: 'The type of the service.',
      type: 'keyword'
    },
    version: {
      dashed_name: 'service-target-version',
      description: 'Version of the service the data was collected from.\n' +
        'This allows to look at a data set only for a specific version of a service.',
      example: '3.2.4',
      flat_name: 'service.target.version',
      ignore_above: 1024,
      level: 'core',
      name: 'version',
      normalize: [],
      original_fieldset: 'service',
      short: 'Version of the service.',
      type: 'keyword'
    }
  },
  type: {
    dashed_name: 'service-type',
    description: 'The type of the service data is collected from.\n' +
      'The type can be used to group and correlate logs and metrics from one service type.\n' +
      'Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
    example: 'elasticsearch',
    flat_name: 'service.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [],
    short: 'The type of the service.',
    type: 'keyword'
  },
  version: {
    dashed_name: 'service-version',
    description: 'Version of the service the data was collected from.\n' +
      'This allows to look at a data set only for a specific version of a service.',
    example: '3.2.4',
    flat_name: 'service.version',
    ignore_above: 1024,
    level: 'core',
    name: 'version',
    normalize: [],
    short: 'Version of the service.',
    type: 'keyword'
  }
}