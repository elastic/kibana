/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { ConnectorTypeInfoMinimal } from '@kbn/workflows';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { getStepIconCssProperties } from '../../../shared/ui/step_icons/get_step_icon_css_properties';

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
    actionTypeId: 'slack',
    displayName: 'Slack',
  },
  {
    actionTypeId: 'inference',
    displayName: 'Inference',
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
  useEffect(() => {
    if (!connectorsData?.connectorTypes) {
      return;
    }
    const connectorTypes = Object.values(connectorsData.connectorTypes).map((connector) => ({
      actionTypeId: connector.actionTypeId.slice(1), // remove the leading dot
      displayName: connector.displayName,
    }));

    // Run async functions
    (async () => {
      await Promise.all([
        injectDynamicConnectorIcons([...predefinedStepTypes, ...connectorTypes]),
        injectDynamicShadowIcons([...predefinedStepTypes, ...connectorTypes]),
      ]);
    })();
  }, [connectorsData?.connectorTypes]);
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
    const connectorType = connector.actionTypeId;
    const displayName = connector.displayName;

    try {
      // Generate CSS rule for this connector
      const cssProperties = await getStepIconCssProperties(connectorType);

      // Only inject CSS if we successfully generated an icon
      if (cssProperties) {
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
        // background-color is set in get_monaco_workflow_overrides_styles.tsx
        cssToInject += `
          /* Target by aria-label content */
          ${selector} { 
            content: " " !important;
            width: 16px !important;
            height: 16px !important;
            display: block !important;
            ${cssProperties}
            background-size: 12px 12px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
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
      // const iconBase64 = await getStepIconBase64(connectorType);

      const cssProperties = await getStepIconCssProperties(connectorType);
      // Only inject CSS if we successfully generated an icon
      if (cssProperties) {
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

        // background-color is set in get_base_type_icons_styles.tsx
        cssToInject += `
          .type-inline-highlight.type-${className}::after {
            ${cssProperties}
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
