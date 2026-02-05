/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

// eslint-disable-next-line complexity
export const getStepIconType = (nodeType: string): EuiIconType => {
  let iconType: EuiIconType = 'info';

  let typeToMatch = nodeType;
  if (nodeType.startsWith('trigger_')) {
    typeToMatch = nodeType.replace('trigger_', '');
  }

  switch (typeToMatch) {
    // triggers
    case 'manual':
      iconType = 'play';
      break;
    case 'alert':
      iconType = 'warning';
      break;
    case 'scheduled':
      iconType = 'clock';
      break;

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
      if (typeToMatch.startsWith('elasticsearch')) {
        iconType = 'logoElasticsearch';
      } else if (typeToMatch.startsWith('kibana')) {
        iconType = 'logoKibana';
      } else {
        iconType = 'plugs';
      }
      break;
  }
  return iconType;
};
