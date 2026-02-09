/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EntityDefinition, EntityCategory } from './types';

/**
 * Category order for UI display
 */
export const CATEGORY_ORDER: EntityCategory[] = [
  'infrastructure',
  'kubernetes',
  'cloud',
  'aws',
  'serverless',
  'database',
  'messaging',
  'application',
];

/**
 * Human-readable category labels
 */
export const CATEGORY_LABELS: Record<EntityCategory, string> = {
  infrastructure: i18n.translate('metricsExperience.entityDefinitions.category.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  kubernetes: i18n.translate('metricsExperience.entityDefinitions.category.kubernetes', {
    defaultMessage: 'Kubernetes',
  }),
  cloud: i18n.translate('metricsExperience.entityDefinitions.category.cloud', {
    defaultMessage: 'Cloud',
  }),
  aws: i18n.translate('metricsExperience.entityDefinitions.category.aws', {
    defaultMessage: 'AWS',
  }),
  serverless: i18n.translate('metricsExperience.entityDefinitions.category.serverless', {
    defaultMessage: 'Serverless',
  }),
  database: i18n.translate('metricsExperience.entityDefinitions.category.database', {
    defaultMessage: 'Databases',
  }),
  messaging: i18n.translate('metricsExperience.entityDefinitions.category.messaging', {
    defaultMessage: 'Messaging',
  }),
  application: i18n.translate('metricsExperience.entityDefinitions.category.application', {
    defaultMessage: 'Application',
  }),
};

/**
 * Entity definitions based on OpenTelemetry semantic conventions
 * Each entity has a primary identifying attribute that uniquely identifies instances
 */
export const ENTITY_DEFINITIONS: EntityDefinition[] = [
  // Infrastructure entities
  {
    id: 'host',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.host', {
      defaultMessage: 'Hosts',
    }),
    identifyingAttribute: 'host.name',
    alternativeAttributes: ['host.id', 'host.hostname'],
    iconType: 'compute',
    category: 'infrastructure',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.host.description', {
      defaultMessage: 'Physical or virtual machines',
    }),
    metricPrefixes: ['system.'],
  },
  {
    id: 'container',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.container', {
      defaultMessage: 'Containers',
    }),
    identifyingAttribute: 'container.id',
    alternativeAttributes: ['container.name'],
    iconType: 'container',
    category: 'infrastructure',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.container.description',
      { defaultMessage: 'Docker or OCI containers' }
    ),
    metricPrefixes: ['container.'],
  },
  {
    id: 'service',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.service', {
      defaultMessage: 'Services',
    }),
    identifyingAttribute: 'service.name',
    alternativeAttributes: ['service.instance.id'],
    iconType: 'apmApp',
    category: 'application',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.service.description', {
      defaultMessage: 'Application services',
    }),
    metricPrefixes: [],
  },
  // Kubernetes entities
  {
    id: 'k8s.pod',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sPod', {
      defaultMessage: 'K8s Pods',
    }),
    identifyingAttribute: 'k8s.pod.name',
    alternativeAttributes: ['k8s.pod.uid', 'kubernetes.pod.name', 'kubernetes.pod.uid'],
    iconType: 'kubernetesNode',
    category: 'kubernetes',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.k8sPod.description', {
      defaultMessage: 'Kubernetes Pods',
    }),
    metricPrefixes: ['k8s.pod.', 'kubernetes.pod.'],
  },
  {
    id: 'k8s.node',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sNode', {
      defaultMessage: 'K8s Nodes',
    }),
    identifyingAttribute: 'k8s.node.name',
    alternativeAttributes: ['k8s.node.uid', 'kubernetes.node.name'],
    iconType: 'node',
    category: 'kubernetes',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.k8sNode.description', {
      defaultMessage: 'Kubernetes Nodes',
    }),
    metricPrefixes: ['k8s.node.', 'kubernetes.node.'],
  },
  {
    id: 'k8s.container',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sContainer', {
      defaultMessage: 'K8s Containers',
    }),
    identifyingAttribute: 'k8s.container.name',
    alternativeAttributes: ['kubernetes.container.name'],
    iconType: 'container',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sContainer.description',
      { defaultMessage: 'Containers running in Kubernetes' }
    ),
    metricPrefixes: ['k8s.container.', 'kubernetes.container.', 'container.'],
  },
  {
    id: 'k8s.deployment',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sDeployment', {
      defaultMessage: 'K8s Deployments',
    }),
    identifyingAttribute: 'k8s.deployment.name',
    alternativeAttributes: ['k8s.deployment.uid', 'kubernetes.deployment.name'],
    iconType: 'package',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sDeployment.description',
      { defaultMessage: 'Kubernetes Deployments' }
    ),
    metricPrefixes: ['k8s.deployment.', 'kubernetes.deployment.'],
  },
  {
    id: 'k8s.namespace',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sNamespace', {
      defaultMessage: 'K8s Namespaces',
    }),
    identifyingAttribute: 'k8s.namespace.name',
    alternativeAttributes: ['kubernetes.namespace'],
    iconType: 'namespace',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sNamespace.description',
      { defaultMessage: 'Kubernetes Namespaces' }
    ),
    metricPrefixes: ['k8s.namespace.', 'kubernetes.namespace.'],
  },
  {
    id: 'k8s.replicaset',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sReplicaSet', {
      defaultMessage: 'K8s ReplicaSets',
    }),
    identifyingAttribute: 'k8s.replicaset.name',
    alternativeAttributes: ['k8s.replicaset.uid', 'kubernetes.replicaset.name'],
    iconType: 'copy',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sReplicaSet.description',
      { defaultMessage: 'Kubernetes ReplicaSets' }
    ),
    metricPrefixes: ['k8s.replicaset.', 'kubernetes.replicaset.'],
  },
  {
    id: 'k8s.daemonset',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sDaemonSet', {
      defaultMessage: 'K8s DaemonSets',
    }),
    identifyingAttribute: 'k8s.daemonset.name',
    alternativeAttributes: ['k8s.daemonset.uid', 'kubernetes.daemonset.name'],
    iconType: 'layers',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sDaemonSet.description',
      { defaultMessage: 'Kubernetes DaemonSets' }
    ),
    metricPrefixes: ['k8s.daemonset.', 'kubernetes.daemonset.'],
  },
  {
    id: 'k8s.statefulset',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sStatefulSet', {
      defaultMessage: 'K8s StatefulSets',
    }),
    identifyingAttribute: 'k8s.statefulset.name',
    alternativeAttributes: ['k8s.statefulset.uid', 'kubernetes.statefulset.name'],
    iconType: 'database',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sStatefulSet.description',
      { defaultMessage: 'Kubernetes StatefulSets' }
    ),
    metricPrefixes: ['k8s.statefulset.', 'kubernetes.statefulset.'],
  },
  {
    id: 'k8s.job',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sJob', {
      defaultMessage: 'K8s Jobs',
    }),
    identifyingAttribute: 'k8s.job.name',
    alternativeAttributes: ['k8s.job.uid', 'kubernetes.job.name'],
    iconType: 'play',
    category: 'kubernetes',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.k8sJob.description', {
      defaultMessage: 'Kubernetes Jobs',
    }),
    metricPrefixes: ['k8s.job.', 'kubernetes.job.'],
  },
  {
    id: 'k8s.cronjob',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sCronJob', {
      defaultMessage: 'K8s CronJobs',
    }),
    identifyingAttribute: 'k8s.cronjob.name',
    alternativeAttributes: ['k8s.cronjob.uid', 'kubernetes.cronjob.name'],
    iconType: 'clock',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sCronJob.description',
      { defaultMessage: 'Kubernetes CronJobs' }
    ),
    metricPrefixes: ['k8s.cronjob.', 'kubernetes.cronjob.'],
  },
  {
    id: 'k8s.cluster',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.k8sCluster', {
      defaultMessage: 'K8s Clusters',
    }),
    identifyingAttribute: 'k8s.cluster.name',
    alternativeAttributes: ['k8s.cluster.uid', 'kubernetes.cluster.name'],
    iconType: 'cluster',
    category: 'kubernetes',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.k8sCluster.description',
      { defaultMessage: 'Kubernetes Clusters' }
    ),
    metricPrefixes: ['k8s.cluster.', 'kubernetes.cluster.'],
  },
  // Cloud entities
  {
    id: 'cloud.instance',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.cloudInstance', {
      defaultMessage: 'Cloud Instances',
    }),
    identifyingAttribute: 'cloud.instance.id',
    alternativeAttributes: ['cloud.instance.name'],
    iconType: 'cloudSunny',
    category: 'cloud',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.cloudInstance.description',
      { defaultMessage: 'Cloud provider instances (EC2, GCE, Azure VM)' }
    ),
    metricPrefixes: [],
  },
  {
    id: 'cloud.region',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.cloudRegion', {
      defaultMessage: 'Cloud Regions',
    }),
    identifyingAttribute: 'cloud.region',
    iconType: 'globe',
    category: 'cloud',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.cloudRegion.description',
      { defaultMessage: 'Cloud provider regions' }
    ),
    metricPrefixes: [],
  },
  {
    id: 'cloud.availability_zone',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.cloudAZ', {
      defaultMessage: 'Availability Zones',
    }),
    identifyingAttribute: 'cloud.availability_zone',
    iconType: 'visMapRegion',
    category: 'cloud',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.cloudAZ.description', {
      defaultMessage: 'Cloud availability zones',
    }),
    metricPrefixes: [],
  },
  {
    id: 'cloud.provider',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.cloudProvider', {
      defaultMessage: 'Cloud Providers',
    }),
    identifyingAttribute: 'cloud.provider',
    iconType: 'cloudSunny',
    category: 'cloud',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.cloudProvider.description',
      { defaultMessage: 'Cloud providers (AWS, GCP, Azure)' }
    ),
    metricPrefixes: [],
  },
  // AWS entities
  {
    id: 'aws.ec2',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.awsEc2', {
      defaultMessage: 'EC2 Instances',
    }),
    identifyingAttribute: 'cloud.instance.id',
    alternativeAttributes: ['cloud.instance.name', 'aws.ec2.instance.public.ip'],
    iconType: 'compute',
    category: 'aws',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.awsEc2.description', {
      defaultMessage: 'Amazon EC2 instances',
    }),
    metricPrefixes: ['aws.ec2.'],
  },
  {
    id: 'aws.rds',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.awsRds', {
      defaultMessage: 'RDS Databases',
    }),
    identifyingAttribute: 'aws.rds.db_instance.identifier',
    alternativeAttributes: ['aws.rds.db_instance.arn'],
    iconType: 'database',
    category: 'aws',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.awsRds.description', {
      defaultMessage: 'Amazon RDS database instances',
    }),
    metricPrefixes: ['aws.rds.'],
  },
  {
    id: 'aws.s3',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.awsS3', {
      defaultMessage: 'S3 Buckets',
    }),
    identifyingAttribute: 'aws.s3.bucket.name',
    iconType: 'storage',
    category: 'aws',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.awsS3.description', {
      defaultMessage: 'Amazon S3 buckets',
    }),
    metricPrefixes: ['aws.s3.'],
  },
  {
    id: 'aws.sqs',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.awsSqs', {
      defaultMessage: 'SQS Queues',
    }),
    identifyingAttribute: 'aws.sqs.queue.name',
    alternativeAttributes: ['messaging.destination.name'],
    iconType: 'listAdd',
    category: 'aws',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.awsSqs.description', {
      defaultMessage: 'Amazon SQS queues',
    }),
    metricPrefixes: ['aws.sqs.', 'messaging.'],
  },
  {
    id: 'aws.lambda',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.awsLambda', {
      defaultMessage: 'Lambda Functions',
    }),
    identifyingAttribute: 'faas.name',
    alternativeAttributes: ['cloud.resource_id', 'aws.lambda.invoked_arn'],
    iconType: 'function',
    category: 'aws',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.awsLambda.description',
      { defaultMessage: 'AWS Lambda serverless functions' }
    ),
    metricPrefixes: ['faas.', 'aws.lambda.'],
  },
  // Serverless entities
  {
    id: 'faas',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.faas', {
      defaultMessage: 'Serverless Functions',
    }),
    identifyingAttribute: 'faas.name',
    alternativeAttributes: ['faas.id', 'cloud.resource_id'],
    iconType: 'function',
    category: 'serverless',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.faas.description', {
      defaultMessage: 'Serverless functions (Lambda, Cloud Functions, Azure Functions)',
    }),
    metricPrefixes: ['faas.'],
  },
  // Process entities
  {
    id: 'process',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.process', {
      defaultMessage: 'Processes',
    }),
    identifyingAttribute: 'process.pid',
    alternativeAttributes: ['process.executable.name', 'process.command', 'process.name'],
    iconType: 'console',
    category: 'infrastructure',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.process.description', {
      defaultMessage: 'Operating system processes',
    }),
    metricPrefixes: ['process.'],
  },
  // Database entities
  {
    id: 'database',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.database', {
      defaultMessage: 'Databases',
    }),
    identifyingAttribute: 'db.namespace',
    alternativeAttributes: ['db.name', 'db.system'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.database.description', {
      defaultMessage: 'Database instances',
    }),
    metricPrefixes: ['db.'],
  },
  {
    id: 'redis',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.redis', {
      defaultMessage: 'Redis Instances',
    }),
    identifyingAttribute: 'db.redis.database_index',
    alternativeAttributes: ['server.address', 'net.peer.name'],
    iconType: 'database',
    category: 'database',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.redis.description', {
      defaultMessage: 'Redis cache instances',
    }),
    metricPrefixes: ['db.', 'redis.'],
  },
  {
    id: 'elasticsearch',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.elasticsearch', {
      defaultMessage: 'Elasticsearch Clusters',
    }),
    identifyingAttribute: 'db.elasticsearch.cluster.name',
    alternativeAttributes: ['elasticsearch.cluster.name', 'elasticsearch.cluster.uuid'],
    iconType: 'logoElasticsearch',
    category: 'database',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.elasticsearch.description',
      { defaultMessage: 'Elasticsearch clusters' }
    ),
    metricPrefixes: ['elasticsearch.', 'db.'],
  },
  // Messaging entities
  {
    id: 'kafka',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.kafka', {
      defaultMessage: 'Kafka Topics',
    }),
    identifyingAttribute: 'messaging.destination.name',
    alternativeAttributes: ['kafka.topic', 'messaging.kafka.consumer.group'],
    iconType: 'logstashQueue',
    category: 'messaging',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.kafka.description', {
      defaultMessage: 'Apache Kafka topics',
    }),
    metricPrefixes: ['messaging.', 'kafka.'],
  },
  {
    id: 'messaging.destination',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.messagingDestination', {
      defaultMessage: 'Message Queues',
    }),
    identifyingAttribute: 'messaging.destination.name',
    alternativeAttributes: ['messaging.system'],
    iconType: 'logstashQueue',
    category: 'messaging',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.messagingDestination.description',
      { defaultMessage: 'Message queue destinations' }
    ),
    metricPrefixes: ['messaging.'],
  },
  // Application entities
  {
    id: 'browser',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.browser', {
      defaultMessage: 'Browser Apps',
    }),
    identifyingAttribute: 'browser.name',
    alternativeAttributes: ['user_agent.name', 'browser.platform'],
    iconType: 'desktop',
    category: 'application',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.browser.description', {
      defaultMessage: 'Browser applications',
    }),
    metricPrefixes: ['browser.'],
  },
  {
    id: 'url',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.url', {
      defaultMessage: 'URLs',
    }),
    identifyingAttribute: 'url.full',
    alternativeAttributes: ['url.path', 'url.domain', 'http.url'],
    iconType: 'link',
    category: 'application',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.url.description', {
      defaultMessage: 'URL endpoints',
    }),
    metricPrefixes: ['http.'],
  },
  {
    id: 'http.route',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.httpRoute', {
      defaultMessage: 'HTTP Routes',
    }),
    identifyingAttribute: 'http.route',
    alternativeAttributes: ['url.path'],
    iconType: 'link',
    category: 'application',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.httpRoute.description',
      { defaultMessage: 'HTTP API routes' }
    ),
    metricPrefixes: ['http.'],
  },
  {
    id: 'user',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.user', {
      defaultMessage: 'Users',
    }),
    identifyingAttribute: 'user.id',
    alternativeAttributes: ['user.name', 'user.email', 'enduser.id'],
    iconType: 'user',
    category: 'application',
    description: i18n.translate('metricsExperience.entityDefinitions.entity.user.description', {
      defaultMessage: 'Application users',
    }),
    metricPrefixes: [],
  },
  // Network entities
  {
    id: 'network.peer',
    displayName: i18n.translate('metricsExperience.entityDefinitions.entity.networkPeer', {
      defaultMessage: 'Network Peers',
    }),
    identifyingAttribute: 'network.peer.address',
    alternativeAttributes: ['net.peer.name', 'server.address', 'client.address'],
    iconType: 'globe',
    category: 'infrastructure',
    description: i18n.translate(
      'metricsExperience.entityDefinitions.entity.networkPeer.description',
      { defaultMessage: 'Network endpoints and peers' }
    ),
    metricPrefixes: ['network.'],
  },
];
