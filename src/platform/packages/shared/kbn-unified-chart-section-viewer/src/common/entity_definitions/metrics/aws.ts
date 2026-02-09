/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CuratedMetricQuery } from '../types';

/**
 * Curated metrics for AWS EC2 entities
 * Based on AWS CloudWatch metrics collected via Elastic Agent
 */
export const EC2_METRICS: CuratedMetricQuery[] = [
  // EC2 CPU Utilization
  {
    id: 'ec2_cpu_utilization',
    displayName: 'CPU Utilization',
    description: 'EC2 instance CPU utilization percentage',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.cpu.total.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'aws.ec2.cpu.total.pct',
  },

  // EC2 Network In
  {
    id: 'ec2_network_in',
    displayName: 'Network In',
    description: 'EC2 instance network bytes received',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.network.in.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.ec2.network.in.bytes',
  },

  // EC2 Network Out
  {
    id: 'ec2_network_out',
    displayName: 'Network Out',
    description: 'EC2 instance network bytes transmitted',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.network.out.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.ec2.network.out.bytes',
  },

  // EC2 Disk Read
  {
    id: 'ec2_disk_read',
    displayName: 'Disk Read',
    description: 'EC2 instance disk read bytes',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.diskio.read.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.ec2.diskio.read.bytes',
  },

  // EC2 Disk Write
  {
    id: 'ec2_disk_write',
    displayName: 'Disk Write',
    description: 'EC2 instance disk write bytes',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.diskio.write.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.ec2.diskio.write.bytes',
  },

  // EC2 Status Check Failed
  {
    id: 'ec2_status_check_failed',
    displayName: 'Status Check Failed',
    description: 'EC2 instance status check failures',
    dataSource: 'ecs',
    requiredFields: ['aws.ec2.status.check_failed'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.ec2.status.check_failed',
  },
];

/**
 * Curated metrics for AWS RDS entities
 */
export const RDS_METRICS: CuratedMetricQuery[] = [
  // RDS CPU Utilization
  {
    id: 'rds_cpu_utilization',
    displayName: 'CPU Utilization',
    description: 'RDS instance CPU utilization percentage',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.cpu.total.pct'],
    unit: 'percent',
    instrument: 'gauge',
    field: 'aws.rds.cpu.total.pct',
  },

  // RDS Database Connections
  {
    id: 'rds_connections',
    displayName: 'Database Connections',
    description: 'Number of database connections',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.database_connections'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.rds.database_connections',
  },

  // RDS Freeable Memory
  {
    id: 'rds_freeable_memory',
    displayName: 'Freeable Memory',
    description: 'Amount of available RAM',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.freeable_memory.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'aws.rds.freeable_memory.bytes',
  },

  // RDS Free Storage Space
  {
    id: 'rds_free_storage',
    displayName: 'Free Storage Space',
    description: 'Amount of available storage space',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.free_storage.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'aws.rds.free_storage.bytes',
  },

  // RDS Read IOPS
  {
    id: 'rds_read_iops',
    displayName: 'Read IOPS',
    description: 'Average read I/O operations per second',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.read_iops.avg'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.rds.read_iops.avg',
  },

  // RDS Write IOPS
  {
    id: 'rds_write_iops',
    displayName: 'Write IOPS',
    description: 'Average write I/O operations per second',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.write_iops.avg'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.rds.write_iops.avg',
  },

  // RDS Read Latency
  {
    id: 'rds_read_latency',
    displayName: 'Read Latency',
    description: 'Average read latency',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.read_latency.sec'],
    unit: 's',
    instrument: 'gauge',
    field: 'aws.rds.read_latency.sec',
  },

  // RDS Write Latency
  {
    id: 'rds_write_latency',
    displayName: 'Write Latency',
    description: 'Average write latency',
    dataSource: 'ecs',
    requiredFields: ['aws.rds.write_latency.sec'],
    unit: 's',
    instrument: 'gauge',
    field: 'aws.rds.write_latency.sec',
  },
];

/**
 * Curated metrics for AWS S3 entities
 */
export const S3_METRICS: CuratedMetricQuery[] = [
  // S3 Bucket Size
  {
    id: 's3_bucket_size',
    displayName: 'Bucket Size',
    description: 'Total size of the S3 bucket',
    dataSource: 'ecs',
    requiredFields: ['aws.s3_daily_storage.bucket.size.bytes'],
    unit: 'bytes',
    instrument: 'gauge',
    field: 'aws.s3_daily_storage.bucket.size.bytes',
  },

  // S3 Number of Objects
  {
    id: 's3_object_count',
    displayName: 'Object Count',
    description: 'Number of objects in the S3 bucket',
    dataSource: 'ecs',
    requiredFields: ['aws.s3_daily_storage.number_of_objects'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.s3_daily_storage.number_of_objects',
  },

  // S3 All Requests
  {
    id: 's3_all_requests',
    displayName: 'All Requests',
    description: 'Total number of requests to the S3 bucket',
    dataSource: 'ecs',
    requiredFields: ['aws.s3_request.requests.total'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.s3_request.requests.total',
  },

  // S3 Download Bytes
  {
    id: 's3_download_bytes',
    displayName: 'Download Bytes',
    description: 'Total bytes downloaded from the S3 bucket',
    dataSource: 'ecs',
    requiredFields: ['aws.s3_request.downloaded.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.s3_request.downloaded.bytes',
  },

  // S3 Upload Bytes
  {
    id: 's3_upload_bytes',
    displayName: 'Upload Bytes',
    description: 'Total bytes uploaded to the S3 bucket',
    dataSource: 'ecs',
    requiredFields: ['aws.s3_request.uploaded.bytes'],
    unit: 'bytes',
    instrument: 'counter',
    field: 'aws.s3_request.uploaded.bytes',
  },
];

/**
 * Curated metrics for AWS SQS entities
 */
export const SQS_METRICS: CuratedMetricQuery[] = [
  // SQS Messages Visible
  {
    id: 'sqs_messages_visible',
    displayName: 'Messages Visible',
    description: 'Number of messages available for retrieval',
    dataSource: 'ecs',
    requiredFields: ['aws.sqs.messages.visible'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.sqs.messages.visible',
  },

  // SQS Messages Sent
  {
    id: 'sqs_messages_sent',
    displayName: 'Messages Sent',
    description: 'Number of messages sent to the queue',
    dataSource: 'ecs',
    requiredFields: ['aws.sqs.messages.sent'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.sqs.messages.sent',
  },

  // SQS Messages Received
  {
    id: 'sqs_messages_received',
    displayName: 'Messages Received',
    description: 'Number of messages received from the queue',
    dataSource: 'ecs',
    requiredFields: ['aws.sqs.messages.received'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.sqs.messages.received',
  },

  // SQS Messages Deleted
  {
    id: 'sqs_messages_deleted',
    displayName: 'Messages Deleted',
    description: 'Number of messages deleted from the queue',
    dataSource: 'ecs',
    requiredFields: ['aws.sqs.messages.deleted'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.sqs.messages.deleted',
  },

  // SQS Oldest Message Age
  {
    id: 'sqs_oldest_message_age',
    displayName: 'Oldest Message Age',
    description: 'Age of the oldest message in the queue',
    dataSource: 'ecs',
    requiredFields: ['aws.sqs.oldest_message_age.sec'],
    unit: 's',
    instrument: 'gauge',
    field: 'aws.sqs.oldest_message_age.sec',
  },
];

/**
 * Curated metrics for AWS Lambda entities
 */
export const LAMBDA_METRICS: CuratedMetricQuery[] = [
  // Lambda Invocations
  {
    id: 'lambda_invocations',
    displayName: 'Invocations',
    description: 'Number of function invocations',
    dataSource: 'ecs',
    requiredFields: ['aws.lambda.metrics.Invocations.sum'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.lambda.metrics.Invocations.sum',
  },

  // Lambda Duration
  {
    id: 'lambda_duration',
    displayName: 'Duration',
    description: 'Average function execution duration',
    dataSource: 'ecs',
    requiredFields: ['aws.lambda.metrics.Duration.avg'],
    unit: 'ms',
    instrument: 'gauge',
    field: 'aws.lambda.metrics.Duration.avg',
  },

  // Lambda Errors
  {
    id: 'lambda_errors',
    displayName: 'Errors',
    description: 'Number of function errors',
    dataSource: 'ecs',
    requiredFields: ['aws.lambda.metrics.Errors.sum'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.lambda.metrics.Errors.sum',
  },

  // Lambda Throttles
  {
    id: 'lambda_throttles',
    displayName: 'Throttles',
    description: 'Number of throttled invocations',
    dataSource: 'ecs',
    requiredFields: ['aws.lambda.metrics.Throttles.sum'],
    unit: 'count',
    instrument: 'counter',
    field: 'aws.lambda.metrics.Throttles.sum',
  },

  // Lambda Concurrent Executions
  {
    id: 'lambda_concurrent_executions',
    displayName: 'Concurrent Executions',
    description: 'Number of concurrent function executions',
    dataSource: 'ecs',
    requiredFields: ['aws.lambda.metrics.ConcurrentExecutions.max'],
    unit: 'count',
    instrument: 'gauge',
    field: 'aws.lambda.metrics.ConcurrentExecutions.max',
  },
];
