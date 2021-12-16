/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ALERT_NAMESPACE } from './technical_field_names';

const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;
const ALERT_INSTANCE_ID = `${ALERT_NAMESPACE}.instance.id` as const;

export { ALERT_EVALUATION_THRESHOLD, ALERT_EVALUATION_VALUE, ALERT_INSTANCE_ID };
