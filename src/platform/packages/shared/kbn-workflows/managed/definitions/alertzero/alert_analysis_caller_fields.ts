/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The fields of a caller alert that the Alert Analysis workflow reads, in its prompt and outside it.
 * A Worker loads only these, so a field the workflow starts to read must be added here:
 * `alert_analysis_caller_fields.test.ts` fails until it is. `_id` and `_index` are not listed.
 */
export const ALERT_ANALYSIS_FIELDS = [
  '@timestamp',
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.name',
  'kibana.alert.workflow_tags',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'event.outcome',
  'event.type',
  'event.action',
  'event.category',
  'event.code',
  'event.severity',
  'event.dataset',
  'user.name',
  'user.domain',
  'user.id',
  'user.asset.criticality',
  'user.risk.calculated_level',
  'host.id',
  'host.name',
  'host.hostname',
  'host.os.name',
  'host.os.version',
  'host.asset.criticality',
  'host.risk.calculated_level',
  'process.name',
  'process.executable',
  'process.command_line',
  'process.working_directory',
  'process.hash.sha256',
  'process.code_signature.trusted',
  'process.code_signature.subject_name',
  'process.code_signature.exists',
  'process.parent.name',
  'process.parent.executable',
  'process.parent.command_line',
  'process.parent.code_signature.trusted',
  'process.parent.code_signature.subject_name',
  'file.path',
  'file.name',
  'file.hash.sha256',
  'network.protocol',
  'source.ip',
  'source.port',
  'destination.ip',
  'destination.port',
  'dns.question.name',
  'url.full',
  'cloud.provider',
  'cloud.region',
  'cloud.account.id',
  'aws.cloudtrail.user_identity.arn',
  'azure.auditlogs.properties.initiated_by.user.user_principal_name',
  'gcp.audit.authentication_info.principal_email',
] as const;
