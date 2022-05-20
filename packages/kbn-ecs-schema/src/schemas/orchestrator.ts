/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
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
    id: {
      dashed_name: 'orchestrator-cluster-id',
      description: 'Unique ID of the cluster.',
      flat_name: 'orchestrator.cluster.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'cluster.id',
      normalize: [],
      short: 'Unique ID of the cluster.',
      type: 'keyword'
    },
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
    id: {
      dashed_name: 'orchestrator-resource-id',
      description: 'Unique ID of the resource being acted upon.',
      flat_name: 'orchestrator.resource.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'resource.id',
      normalize: [],
      short: 'Unique ID of the resource being acted upon.',
      type: 'keyword'
    },
    ip: {
      dashed_name: 'orchestrator-resource-ip',
      description: 'IP address assigned to the resource associated with the event being observed. In the case of a Kubernetes Pod, this array would contain only one element: the IP of the Pod (as opposed to the Node on which the Pod is running).',
      flat_name: 'orchestrator.resource.ip',
      level: 'extended',
      name: 'resource.ip',
      normalize: [ 'array' ],
      short: 'IP address assigned to the resource associated with the event being observed.',
      type: 'ip'
    },
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
    parent: {
      type: {
        dashed_name: 'orchestrator-resource-parent-type',
        description: 'Type or kind of the parent resource associated with the event being observed. In Kubernetes, this will be the name of a built-in workload resource (e.g., Deployment, StatefulSet, DaemonSet).',
        example: 'DaemonSet',
        flat_name: 'orchestrator.resource.parent.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'resource.parent.type',
        normalize: [],
        short: 'Type or kind of the parent resource associated with the event being observed.',
        type: 'keyword'
      }
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