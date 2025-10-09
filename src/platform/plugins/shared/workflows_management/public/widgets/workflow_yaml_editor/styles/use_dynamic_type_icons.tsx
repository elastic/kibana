/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { STACK_CONNECTOR_LOGOS } from '@kbn/stack-connectors-plugin/public/logos';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ConnectorsResponse } from '../../../entities/connectors/model/use_available_connectors';
import { HARDCODED_ICONS } from './hardcoded_icons';
import type { ConnectorTypeInfoMinimal } from '../../../../common/schema';
import { ElasticsearchLogo } from './icons/elasticsearch.svg';
import { KibanaLogo } from './icons/kibana.svg';

const predefinedStepTypes = [
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
    injectDynamicConnectorIcons([...predefinedStepTypes, ...connectorTypes]);
    injectDynamicShadowIcons([...predefinedStepTypes, ...connectorTypes]);
  }, [connectorsData?.connectorTypes]);
}

/**
 * Inject dynamic CSS for connector icons in Monaco autocompletion
 * This creates CSS rules for each connector type to show custom icons
 */
function injectDynamicConnectorIcons(connectorTypes: ConnectorTypeInfoMinimal[]) {
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
      const iconBase64 = getConnectorIconBase64(connectorType);

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
        }
        cssToInject += `
          /* Target by aria-label content */
          ${selector} {
            background-image: url("data:image/svg+xml;base64,${iconBase64}") !important;
            background-size: 16px 16px !important;
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
function injectDynamicShadowIcons(connectorTypes: ConnectorTypeInfoMinimal[]) {
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
      const iconBase64 = getConnectorIconBase64(connectorType);

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
            background-image: url("data:image/svg+xml;base64,${iconBase64}");
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

/**
 * Default fallback SVG for unknown connectors
 */
const DEFAULT_CONNECTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  </svg>`;

/**
 * Get base64 encoded SVG icon for a connector type
 */
function getConnectorIconBase64(connectorType: string): string {
  try {
    const dotConnectorType = `.${connectorType}`;
    // First, try to get the logo directly from stack connectors
    if (dotConnectorType in STACK_CONNECTOR_LOGOS) {
      const LogoComponent =
        STACK_CONNECTOR_LOGOS[dotConnectorType as keyof typeof STACK_CONNECTOR_LOGOS];
      return getBase64FromReactComponent(LogoComponent);
    }

    if (connectorType === 'elasticsearch') {
      return getBase64FromReactComponent(ElasticsearchLogo);
    }

    if (connectorType === 'kibana') {
      return getBase64FromReactComponent(KibanaLogo);
    }

    // Handle connectors that use EUI built-in icons instead of custom logo components
    if (connectorType === 'slack' || connectorType === 'slack_api') {
      // hardcoded slack logo
      return HARDCODED_ICONS.slack;
    }

    if (connectorType in HARDCODED_ICONS) {
      return HARDCODED_ICONS[connectorType as keyof typeof HARDCODED_ICONS];
    }

    // Fallback to default icon for other connector types
    return btoa(DEFAULT_CONNECTOR_SVG);
  } catch (error) {
    // Fallback to default static icon
    return btoa(DEFAULT_CONNECTOR_SVG);
  }
}

function getBase64FromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>
): string {
  // Render the actual logo component to HTML string
  const logoElement = React.createElement(component, { width: 16, height: 16 });
  let htmlString = renderToStaticMarkup(logoElement);

  // Check if it's an <img> tag (imported SVG) or direct <svg>
  const isImgTag = htmlString.includes('<img');

  if (isImgTag) {
    // Extract the src attribute from the img tag
    const srcMatch = htmlString.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      const srcValue = srcMatch[1];

      // If it's already a data URL, extract the base64 part
      if (srcValue.startsWith('data:image/svg+xml;base64,')) {
        const base64 = srcValue.replace('data:image/svg+xml;base64,', '');
        return base64;
      }

      // If it's a different data URL format, return it as is
      if (srcValue.startsWith('data:')) {
        // Convert to base64 if needed
        const base64 = btoa(srcValue);
        return base64;
      }

      // If it's a regular URL/path, we can't easily convert it here
    }
  } else {
    // It's a direct SVG - handle as before
    const hasFillNone = /fill="none"/i.test(htmlString);

    if (hasFillNone) {
      // Remove fill="none" and add currentColor fill
      htmlString = htmlString
        .replace(/fill="none"/gi, '')
        .replace(/fill='none'/gi, '')
        .replace(/<svg([^>]*?)>/, '<svg$1 fill="currentColor">');
    }
  }

  const base64 = btoa(htmlString);
  return base64;
}
