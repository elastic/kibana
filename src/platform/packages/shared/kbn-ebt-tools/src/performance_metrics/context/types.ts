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
  | `${SyntheticsPageId}`;

export type DescriptionWithPrefix = `[ttfmp_${Key}] ${string}`;
