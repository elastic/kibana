/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type AlertDetailsPageId = 'alert_details';
type AlertingPageId = 'alerts';
type ApmPageId = 'services' | 'traces' | 'dependencies';
type DatasetQualityPageId = 'dataset_quality';
type InfraPageId = 'hosts';
type OnboardingPageId = 'onboarding';
type RuleDetailsPageId = 'rule_details';
type RulesListPageId = 'rules_list';
type SloPageId = 'slos';
type StreamsListPageId = 'streams_list';
type StreamsDetailRetentionPageId = 'streams_detail_retention';
type StreamsDetailPartitioningPageId = 'streams_detail_partitioning';
type StreamsDetailProcessingPageId = 'streams_detail_processing';
type StreamsDetailSchemaPageId = 'streams_detail_schema';
type StreamsDetailDataQualityPageId = 'streams_detail_data_quality';
type StreamsDetailAdvancedPageId = 'streams_detail_advanced';
type StreamsDetailAttachmentsPageId = 'streams_detail_attachments';
type StreamsDetailReferencesPageId = 'streams_detail_references';
type SyntheticsPageId = 'synthetics';

export type Key =
  | `${AlertDetailsPageId}`
  | `${AlertingPageId}`
  | `${ApmPageId}`
  | `${DatasetQualityPageId}`
  | `${InfraPageId}`
  | `${OnboardingPageId}`
  | `${RuleDetailsPageId}`
  | `${RulesListPageId}`
  | `${SloPageId}`
  | `${StreamsListPageId}`
  | `${StreamsDetailRetentionPageId}`
  | `${StreamsDetailPartitioningPageId}`
  | `${StreamsDetailProcessingPageId}`
  | `${StreamsDetailSchemaPageId}`
  | `${StreamsDetailDataQualityPageId}`
  | `${StreamsDetailAdvancedPageId}`
  | `${StreamsDetailAttachmentsPageId}`
  | `${StreamsDetailReferencesPageId}`
  | `${SyntheticsPageId}`;

export type DescriptionWithPrefix = `[ttfmp_${Key}] ${string}`;
