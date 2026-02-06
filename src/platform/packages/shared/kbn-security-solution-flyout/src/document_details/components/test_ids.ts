/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PREFIX } from '../../shared/test_ids';

const ALERT_DESCRIPTION_TEST_ID = `${PREFIX}AlertDescription` as const;
export const ALERT_DESCRIPTION_TITLE_TEST_ID = `${ALERT_DESCRIPTION_TEST_ID}Title` as const;
export const ALERT_DESCRIPTION_DETAILS_TEST_ID = `${ALERT_DESCRIPTION_TEST_ID}Details` as const;
export const RULE_SUMMARY_BUTTON_TEST_ID = `${PREFIX}RuleSummaryButton` as const;
