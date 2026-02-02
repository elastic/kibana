/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { ConnectorsResponse } from '../../../entities/connectors/model/types';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getStepIconBase64,
  type GetStepIconBase64Params,
} from '../../../shared/ui/step_icons/get_step_icon_base64';
import { MonochromeIcons } from '../../../shared/ui/step_icons/monochrome_icons';

export interface ConnectorTypeInfoMinimal extends GetStepIconBase64Params {
  displayName: string;
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
    actionTypeId: 'data.set',
    displayName: 'Set Variables',
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
  const { triggersActionsUi, workflowsExtensions } = useKibana().services;
  const { actionTypeRegistry } = triggersActionsUi;

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

    const registeredTypes = workflowsExtensions.getAllStepDefinitions().map((step) => ({
      actionTypeId: step.id,
      displayName: step.label,
      fromRegistry: true,
      icon: step.icon,
    }));

    const allTypes = [...predefinedStepTypes, ...connectorTypes, ...registeredTypes];

    // Run async functions
    (async () => {
      await Promise.all([
        injectDynamicConnectorIcons(allTypes),
        injectDynamicShadowIcons(allTypes),
      ]);
    })();
  }, [connectorsData?.connectorTypes, actionTypeRegistry, workflowsExtensions]);
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

    // Generate CSS rule for this connector
    const iconBase64 = await getStepIconBase64(connector);

    let selector = '';
    if (connectorType === 'elasticsearch') {
      // Target the codicon class for elasticsearch connectors AND any suggestion with "elasticsearch." in aria-label
      selector = `.codicon-symbol-struct:before,
        .monaco-list .monaco-list-row[aria-label^="elasticsearch."] .suggest-icon:before`;
    } else if (connectorType === 'kibana') {
      // Target the codicon class for kibana connectors AND any suggestion with "kibana." in aria-label
      selector = `.codicon-symbol-module:before,
        .monaco-list .monaco-list-row[aria-label^="kibana."] .suggest-icon:before`;
    } else if (connectorType === 'console') {
      selector = '.codicon-symbol-variable:before';
    } else {
      selector = `.monaco-list .monaco-list-row[aria-label^="${connectorType}"] .suggest-icon:before,
      .monaco-list .monaco-list-row[aria-label^="${displayName}"] .suggest-icon:before`;
    }

    let cssProperties = '';
    if (MonochromeIcons.has(connector.actionTypeId)) {
      cssProperties = `
        mask-image: url("${iconBase64}");
        mask-size: contain;
        background-color: currentColor;
      `;
    } else {
      cssProperties = `background-image: url("${iconBase64}") !important;`;
    }

    cssToInject += `
      /* Target by aria-label content */
      ${selector} {
        ${cssProperties}
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
    // Generate CSS rule for this connector
    const iconBase64 = await getStepIconBase64(connector);

    // Only inject CSS if we successfully generated an icon
    const connectorType = connector.actionTypeId.startsWith('.')
      ? connector.actionTypeId.slice(1)
      : connector.actionTypeId;

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

    let cssProperties = '';
    if (MonochromeIcons.has(connector.actionTypeId)) {
      cssProperties = `
        mask-image: url("${iconBase64}");
        mask-size: contain;
        background-color: currentColor;
      `;
    } else {
      cssProperties = `background-image: url("${iconBase64}");`;
    }

    cssToInject += `
      .type-inline-highlight.type-${className}::after {
        ${cssProperties}
        background-size: contain;
        background-repeat: no-repeat;
      }
    `;
  }

  // Inject the CSS
  if (cssToInject) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssToInject;
    document.head.appendChild(style);
  }
}
