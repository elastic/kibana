/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import RULE_TUNING_WORKER_YAML from './rule_tuning_worker.yaml';

// Triage re-tags unapproved false positives az:inconclusive, so closed alerts alone would hide the
// model's judgement from Rule Tuning. The marker keeps it, and analyst closures still count.
describe('rule_tuning_worker — false positive definition', () => {
  const normalized = RULE_TUNING_WORKER_YAML.replace(/\s+/g, ' ');

  it('counts alerts the model judged false positive, as well as alerts analysts closed as one', () => {
    expect(normalized).toContain(
      'EVAL is_fp = (`kibana.alert.workflow_status` == "closed" AND `kibana.alert.workflow_reason` == "false_positive") OR MV_CONTAINS(`kibana.alert.workflow_tags`, "az:model_fp")'
    );
  });
});
