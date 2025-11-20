/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { useEffect } from 'react';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { useKibana } from '../../../hooks/use_kibana';
import { getStepIconBase64 } from '../../../shared/ui/step_icons/get_step_icon_base64';

export interface ConnectorTypeInfoMinimal {
  actionTypeId: string;
  displayName: string;
  icon?: IconType;
}

export const predefinedStepTypes = [
  {
    actionTypeId: 'console',
    displayName: 'Console',
  },
  {
    actionTypeId: 'elasticsearch',
    displayName: 'Elasticsearch',
  },
  {
    actionTypeId: 'kibana',
    displayName: 'Kibana',
  },
  {
    actionTypeId: 'if',
    displayName: 'If',
  },
  {
    actionTypeId: 'foreach',
    displayName: 'Foreach',
  },
  {
    actionTypeId: 'parallel',
    displayName: 'Parallel',
  },
  {
    actionTypeId: 'merge',
    displayName: 'Merge',
  },
  {
    actionTypeId: 'wait',
    displayName: 'Wait',
  },
  {
    actionTypeId: 'http',
    displayName: 'HTTP',
  },
  {
    actionTypeId: 'manual',
    displayName: 'Manual',
  },
  {
    actionTypeId: 'alert',
    displayName: 'Alert',
  },
  {
    actionTypeId: 'scheduled',
    displayName: 'Scheduled',
  },
];

export function useDynamicTypeIcons(connectorsData: ConnectorsResponse | undefined) {
  const { actionTypeRegistry } = useKibana().services.triggersActionsUi;
  useEffect(() => {
    if (!connectorsData?.connectorTypes) {
      return;
    }
    const connectorTypes = Object.values(connectorsData.connectorTypes).map((connector) => {
      const actionType = actionTypeRegistry.get(connector.actionTypeId);
      return {
        actionTypeId: connector.actionTypeId,
        displayName: connector.displayName,
        icon: actionType.iconClass,
      };
    });

    // Run async functions
    (async () => {
      await Promise.all([
        injectDynamicConnectorIcons([...predefinedStepTypes, ...connectorTypes]),
        injectDynamicShadowIcons([...predefinedStepTypes, ...connectorTypes]),
      ]);
    })();
  }, [connectorsData?.connectorTypes, actionTypeRegistry]);
}

/**
 * Inject dynamic CSS for connector icons in Monaco autocompletion
 * This creates CSS rules for each connector type to show custom icons
 */
async function injectDynamicConnectorIcons(connectorTypes: ConnectorTypeInfoMinimal[]) {
  const styleId = 'dynamic-connector-icons';

  // Remove existing dynamic styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let cssToInject = '';

  for (const connector of Object.values(connectorTypes)) {
    const connectorType = connector.actionTypeId.startsWith('.')
      ? connector.actionTypeId.slice(1)
      : connector.actionTypeId;

    const displayName = connector.displayName;

    try {
      // Generate CSS rule for this connector
      const iconBase64 = await getStepIconBase64(connector);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        let selector = `.monaco-list .monaco-list-row[aria-label^="${connectorType},"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label$=", ${connectorType}"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label*=", ${connectorType},"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label="${connectorType}"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label*="${displayName}"] .suggest-icon:before`;
        if (connectorType === 'elasticsearch') {
          selector = '.codicon-symbol-struct:before';
        } else if (connectorType === 'kibana') {
          selector = '.codicon-symbol-module:before';
        } else if (connectorType === 'console') {
          selector = '.codicon-symbol-variable:before';
        }
        cssToInject += `
          /* Target by aria-label content */
          ${selector} {
            background-image: url("${iconBase64}") !important;
            background-size: 12px 12px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            content: " " !important;
            width: 16px !important;
            height: 16px !important;
            display: block !important;
          }
        `;
      }
    } catch (error) {
      // Silently skip if icon generation fails
    }
  }

  // Inject the CSS
  if (cssToInject) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssToInject;
    document.head.appendChild(style);
  }
}

/**
 * Inject dynamic CSS for connector shadow icons (::after pseudo-elements)
 * This creates CSS rules for each connector type to show custom icons in the editor
 */
async function injectDynamicShadowIcons(connectorTypes: ConnectorTypeInfoMinimal[]) {
  const styleId = 'dynamic-shadow-icons';

  // Remove existing dynamic shadow styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let cssToInject = '';

  for (const connector of connectorTypes) {
    const connectorType = connector.actionTypeId;
    try {
      // Generate CSS rule for this connector shadow icon
      const iconBase64 = await getStepIconBase64(connector);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        // Get the class name for this connector
        let className = connectorType;
        if (connectorType.startsWith('elasticsearch.')) {
          className = 'elasticsearch';
        } else if (connectorType.startsWith('kibana.')) {
          className = 'kibana';
        } else {
          // Handle connectors with dot notation properly
          if (connectorType.startsWith('.')) {
            // For connectors like ".jira", remove the leading dot
            className = connectorType.substring(1);
          } else if (connectorType.includes('.')) {
            // For connectors like "thehive.createAlert", use base name
            className = connectorType.split('.')[0];
          } else {
            // For simple connectors like "slack", use as-is
            className = connectorType;
          }
        }

        cssToInject += `
          .type-inline-highlight.type-${className}::after {
            background-image: url("${iconBase64}");
            background-size: contain;
            background-repeat: no-repeat;
          }
        `;
      }
    } catch (error) {
      // console.log('error getting connector icon base64', error);
      // Silently skip if icon generation fails
    }
  }

  // Inject the CSS
  if (cssToInject) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssToInject;
    document.head.appendChild(style);
  }
}
