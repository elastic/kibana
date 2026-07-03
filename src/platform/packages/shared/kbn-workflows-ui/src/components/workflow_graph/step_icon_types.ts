/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

export const getTriggerTypeIconType = (triggerType: string): IconType => {
  switch (triggerType) {
    case 'trigger_manual':
      return 'play';
    case 'trigger_alert':
      return 'warning';
    case 'trigger_document':
    case 'trigger_event':
      return 'document';
    case 'trigger_scheduled':
      return 'clock';
    default:
      return 'info';
  }
};

// Switch has good readability as it is
// eslint-disable-next-line complexity
export const getStepIconType = (stepType: string): IconType => {
  switch (stepType) {
    // built-in step types — full and base forms both accepted
    case 'http':
      return 'globe';
    case 'console':
      return 'commandLine';
    case 'data':
    case 'data.set':
      return 'database';
    case 'workflow.execute':
      return 'play';
    case 'workflow.executeAsync':
      return 'launch';
    case 'workflow.output':
      return 'arrowRight';
    case 'workflow.fail':
      return 'alert';

    // trigger nodes (short-form, without trigger_ prefix)
    case 'manual':
      return 'play';
    case 'alert':
      return 'warning';
    case 'scheduled':
      return 'clock';

    // flow control nodes
    case 'wait':
      return 'clock';
    case 'waitForInput':
      return 'user';
    case 'enter-if':
    case 'exit-if':
    case 'enter-condition-branch':
    case 'exit-condition-branch':
    case 'if':
      return 'branch';
    case 'if-branch':
      return 'tokenBoolean';
    case 'enter-foreach':
    case 'foreach':
    case 'enter-while':
    case 'while':
      return 'refresh';
    case 'foreach-iteration':
    case 'while-iteration':
      return 'tokenNumber';
    case 'loop':
    case 'loop.break':
    case 'loop.continue':
    case 'loop-break':
    case 'loop-continue':
      return 'controls';
    case 'switch':
    case 'enter-switch':
    case 'exit-switch':
    case 'enter-case-branch':
    case 'exit-case-branch':
    case 'enter-default-branch':
    case 'exit-default-branch':
      return 'productStreamsWired';

    // connectors with EUI icons
    case 'email':
      return 'mail';
    case 'slack':
    case 'slack_api':
      return 'logoSlack';
    case 'inference':
      return 'sparkles';

    default:
      if (stepType.startsWith('elasticsearch')) return 'logoElasticsearch';
      if (stepType.startsWith('kibana')) return 'logoKibana';
      return 'plugs';
  }
};
