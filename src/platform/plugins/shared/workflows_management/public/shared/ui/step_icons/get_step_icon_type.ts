/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export const getTriggerTypeIconType = (triggerType: string): EuiIconType => {
  switch (triggerType) {
    case 'trigger_manual':
      return 'play';
    case 'trigger_alert':
      return 'warning';
    case 'trigger_document':
      return 'document';
    case 'trigger_scheduled':
      return 'clock';
    default:
      return 'info';
  }
};

export const getStepIconType = (nodeType: string): EuiIconType => {
  let iconType: EuiIconType = 'info';

  switch (nodeType) {
    // built-in node types
    case 'http':
      iconType = 'globe';
      break;
    case 'console':
      iconType = 'console';
      break;
    case 'data.set':
      iconType = 'tableOfContents';
      break;

    // flow control nodes
    case 'wait':
      iconType = 'clock';
      break;
    case 'enter-if':
    case 'exit-if':
    case 'enter-condition-branch':
    case 'exit-condition-branch':
    case 'if':
      iconType = 'branch';
      break;
    case 'if-branch':
      iconType = 'tokenBoolean';
      break;
    case 'enter-foreach':
    case 'foreach':
      iconType = 'refresh';
      break;
    case 'foreach-iteration':
      iconType = 'tokenNumber';
      break;

    // connectors which use EUI icons
    case 'email':
      iconType = 'email';
      break;
    case 'slack':
    case 'slack_api':
      iconType = 'logoSlack';
      break;
    case 'inference':
      iconType = 'sparkles';
      break;

    // other connectors
    // will be handled by in getStackConnectorIcon

    default:
      if (nodeType.startsWith('elasticsearch')) {
        iconType = 'logoElasticsearch';
      } else if (nodeType.startsWith('kibana')) {
        iconType = 'logoKibana';
      } else {
        iconType = 'plugs';
      }
      break;
  }
  return iconType;
};
