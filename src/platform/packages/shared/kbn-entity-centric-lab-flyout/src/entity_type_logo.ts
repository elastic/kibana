/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AnthropicIcon, OpenAiIcon } from './ai_provider_icons';
import { AwsEc2Icon, AwsLambdaIcon, AwsS3Icon, type AwsServiceIconComponent } from './aws_service_icons';

/** EUI icon id, or an AWS service mark, for a known entity type label. */
export type EntityTypeIcon = string | AwsServiceIconComponent;

/**
 * Logo for an entity type label. Unknown labels return undefined so callers
 * can fall back to the category icon. The AWS category name stays `logoAWS`;
 * EC2, S3, and Lambda use their service marks.
 */
const TYPE_LOGOS: Readonly<Record<string, EntityTypeIcon>> = {
  aws: 'logoAWS',
  ec2: AwsEc2Icon,
  'ec2 instances': AwsEc2Icon,
  'aws ec2 instance': AwsEc2Icon,
  s3: AwsS3Icon,
  's3 buckets': AwsS3Icon,
  'aws s3 bucket': AwsS3Icon,
  lambda: AwsLambdaIcon,
  'lambda functions': AwsLambdaIcon,
  'aws lambda function': AwsLambdaIcon,

  gcp: 'logoGCP',
  'compute engine': 'logoGCP',
  'gcp compute engine': 'logoGCP',
  'cloud functions': 'logoGCP',
  'gcp cloud function': 'logoGCP',
  'cloud storage': 'logoGCP',
  'gcp cloud storage bucket': 'logoGCP',

  azure: 'logoAzure',
  'virtual machines': 'logoAzure',
  'azure vm': 'logoAzure',
  'azure function': 'logoAzure',
  'blob storage': 'logoAzure',
  'azure blob storage': 'logoAzure',

  kubernetes: 'logoKubernetes',
  'k8s cluster': 'logoKubernetes',
  'k8s namespace': 'logoKubernetes',
  'k8s deployment': 'logoKubernetes',
  'k8s replicaset': 'logoKubernetes',
  'k8s statefulset': 'logoKubernetes',
  'k8s daemonset': 'logoKubernetes',
  'k8s cronjob': 'logoKubernetes',
  'k8s pod': 'logoKubernetes',
  'k8s node': 'logoKubernetes',
  'k8s container': 'logoKubernetes',

  postgres: 'logoPostgres',
  nginx: 'logoNginx',
  haproxy: 'logoHAproxy',
  kafka: 'logoKafka',
  rabbitmq: 'logoRabbitmq',
  'apm service': 'apmApp',
  'bare-metal': 'compute',
  vm: 'compute',
  envoy: 'globe',

  // Product marks. EUI does not ship these.
  openai: OpenAiIcon,
  anthropic: AnthropicIcon,
  // No product mark ships in EUI for these types. Closest glyphs so every
  // type still has an icon in the list, the hex map, and the flyout.
  vault: 'lock',
  jenkins: 'console',
  'custom worker': 'wrench',
};

export const entityTypeLogo = (label: string | undefined): EntityTypeIcon | undefined => {
  if (!label) return undefined;
  return TYPE_LOGOS[label.trim().toLowerCase()];
};
