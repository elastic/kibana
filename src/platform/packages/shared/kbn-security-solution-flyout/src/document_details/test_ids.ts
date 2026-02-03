/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ALERT_DESCRIPTION_TEST_ID = 'securitySolutionFlyoutAlertDescription' as const;
export const ALERT_DESCRIPTION_TITLE_TEST_ID =
  `${ALERT_DESCRIPTION_TEST_ID}Title` as const;
export const ALERT_DESCRIPTION_DETAILS_TEST_ID =
  `${ALERT_DESCRIPTION_TEST_ID}Details` as const;
export const RULE_SUMMARY_BUTTON_TEST_ID =
  'securitySolutionFlyoutRuleSummaryButton' as const;

const REASON_TEST_ID = 'securitySolutionFlyoutReason' as const;
export const REASON_TITLE_TEST_ID = `${REASON_TEST_ID}Title` as const;
export const REASON_DETAILS_TEST_ID = `${REASON_TEST_ID}Details` as const;
export const REASON_DETAILS_PREVIEW_BUTTON_TEST_ID =
  `${REASON_TEST_ID}PreviewButton` as const;

const MITRE_ATTACK_TEST_ID = 'securitySolutionFlyoutMitreAttack' as const;
export const MITRE_ATTACK_TITLE_TEST_ID = `${MITRE_ATTACK_TEST_ID}Title` as const;
export const MITRE_ATTACK_DETAILS_TEST_ID = `${MITRE_ATTACK_TEST_ID}Details` as const;
