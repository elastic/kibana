/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { STACK_CONNECTOR_LOGOS } from '@kbn/stack-connectors-plugin/public';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { addDynamicConnectorsToCache } from '../../../../common/schema';

export function useDynamicConnectorIcons(connectorsData: Record<string, any> | undefined) {
  useEffect(() => {
    if (connectorsData?.connectorTypes) {
      addDynamicConnectorsToCache(connectorsData.connectorTypes);
      // Inject dynamic CSS for connector icons
      // Note: We don't await this to avoid blocking the UI
      // The icon functions don't actually use the services, so we pass null
      injectDynamicConnectorIcons(connectorsData.connectorTypes, null);
      // Inject dynamic CSS for shadow icons (::after pseudo-elements)
      injectDynamicShadowIcons(connectorsData.connectorTypes, null);
    }
  }, [connectorsData?.connectorTypes]);
}

/**
 * Inject dynamic CSS for connector icons in Monaco autocompletion
 * This creates CSS rules for each connector type to show custom icons
 */
async function injectDynamicConnectorIcons(connectorTypes: Record<string, any>, services: any) {
  // console.log(
  //   '🎯 injectDynamicConnectorIcons called with:',
  //   Object.keys(connectorTypes).length,
  //   'connectors'
  // );

  const styleId = 'dynamic-connector-icons';

  // Remove existing dynamic styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let cssToInject = '';

  for (const connector of Object.values(connectorTypes)) {
    const connectorType = (connector as any).actionTypeId;
    const displayName = (connector as any).displayName;

    // Skip if we already have hardcoded CSS for this connector
    if (['elasticsearch', 'kibana'].some((type) => connectorType.includes(type))) {
      continue;
    }

    try {
      // Generate CSS rule for this connector - try multiple targeting strategies
      const iconBase64 = await getConnectorIconBase64(connectorType, services);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        cssToInject += `
          /* Strategy 1: Target by aria-label content - be more specific to avoid conflicts */
          .monaco-list .monaco-list-row[aria-label^="${connectorType},"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label$=", ${connectorType}"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label*=", ${connectorType},"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label="${connectorType}"] .suggest-icon:before,
          .monaco-list .monaco-list-row[aria-label*="${displayName}"] .suggest-icon:before {
            background-image: url("data:image/svg+xml;base64,${iconBase64}") !important;
            background-size: 16px 16px !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            content: " " !important;
            width: 16px !important;
            height: 16px !important;
            display: block !important;
          }
          
          /* Strategy 2: Target by detail text (fallback) - be more specific */
          .monaco-list .monaco-list-row .suggest-detail:contains("${connectorType}") ~ .suggest-icon:before {
            background-image: url("data:image/svg+xml;base64,${iconBase64}") !important;
          }
          
          /* Strategy 3: Target connector-id suggestions by detail text containing connector type */
          .monaco-list .monaco-list-row[data-detail*="${connectorType}"] .suggest-icon:before,
          .monaco-list .monaco-list-row .suggest-detail:contains("${connectorType}") ~ .suggest-icon:before,
          .monaco-list .monaco-list-row:has(.suggest-detail:contains("${connectorType}")) .suggest-icon:before {
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
      // console.warn('🔍 Failed to generate icon for connector:', connectorType, error);
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
async function injectDynamicShadowIcons(connectorTypes: Record<string, any>, services: any) {
  // console.log('🎯 injectDynamicShadowIcons called with:', Object.keys(connectorTypes).length, 'connectors');

  const styleId = 'dynamic-shadow-icons';

  // Remove existing dynamic shadow styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let cssToInject = '';

  for (const connector of Object.values(connectorTypes)) {
    const connectorType = (connector as any).actionTypeId;

    // Skip if we already have hardcoded CSS for this connector
    if (
      [
        'elasticsearch',
        'kibana',
        'console',
        'http',
        'foreach',
        'if',
        'parallel',
        'merge',
        'wait',
      ].some((type) => connectorType.includes(type))
    ) {
      continue;
    }

    try {
      // Generate CSS rule for this connector shadow icon
      const iconBase64 = await getConnectorIconBase64(connectorType, services);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        // Get the class name for this connector (same logic as getConnectorIcon)
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
          .connector-inline-highlight.connector-${className}::after {
            background-image: url("data:image/svg+xml;base64,${iconBase64}");
            background-size: contain;
            background-repeat: no-repeat;
          }
          `;
      }
    } catch (error) {
      // console.warn('🔍 Failed to generate shadow icon for connector:', connectorType, error);
    }
  }

  // Inject the CSS
  if (cssToInject) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssToInject;
    document.head.appendChild(style);
    // console.log('✅ Dynamic shadow icon CSS injected:', cssToInject.length, 'characters');
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
 * Get base64 encoded SVG icon for a connector type (super simplified!)
 * Uses regular imports - much cleaner!
 */
async function getConnectorIconBase64(connectorType: string, services: any): Promise<string> {
  // console.log('🔍 getConnectorIconBase64 called for:', connectorType);

  try {
    // First, try to get the logo directly from stack connectors (regular import!)
    if (connectorType in STACK_CONNECTOR_LOGOS) {
      const LogoComponent =
        STACK_CONNECTOR_LOGOS[connectorType as keyof typeof STACK_CONNECTOR_LOGOS];

      // Render the actual logo component to HTML string
      const logoElement = React.createElement(LogoComponent, { width: 32, height: 32 });
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
          // console.warn('🔍 Cannot convert external image URL to base64:', srcValue);
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

    // Handle connectors that use EUI built-in icons instead of custom logo components
    if (connectorType === '.slack' || connectorType === '.slack_api') {
      // hardcoded slack logo
      return 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==';
    }

    if (connectorType === '.email') {
      // hardcoded email logo
      return 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTQuOTQ5MTk3NCwzLjY4NDQ1ODIgTDguNjM3ODk4NDgsOC45MTIxNzAyNiBDOC4yNjc4NjA2Myw5LjIxODY3NjMxIDcuNzMyMTM5MzcsOS4yMTg2NzYzMSA3LjM2MjEwMTUyLDguOTEyMTcwMjYgTDEuMDUwODAyNTUsMy42ODQ0NTgyIEMxLjAxNzg0NDMyLDMuNzgzNjUwNzcgMSwzLjg4OTc0MTUgMSw0IEwxLDEyIEMxLDEyLjU1MjI4NDcgMS40NDc3MTUyNSwxMyAyLDEzIEwxNCwxMyBDMTQuNTUyMjg0NywxMyAxNSwxMi41NTIyODQ3IDE1LDEyIEwxNSw0IEMxNSwzLjg4OTc0MTUgMTQuOTgyMTU1NywzLjc4MzY1MDc3IDE0Ljk0OTE5NzQsMy42ODQ0NTgyIFogTTIsMiBMMTQsMiBDMTUuMTA0NTY5NSwyIDE2LDIuODk1NDMwNSAxNiw0IEwxNiwxMiBDMTYsMTMuMTA0NTY5NSAxNS4xMDQ1Njk1LDE0IDE0LDE0IEwyLDE0IEMwLjg5NTQzMDUsMTQgMS4zNTI3MDc1ZS0xNiwxMy4xMDQ1Njk1IDAsMTIgTDAsNCBDLTEuMzUyNzA3NWUtMTYsMi44OTU0MzA1IDAuODk1NDMwNSwyIDIsMiBaIE0xLjc4OTY5MzExLDMgTDcuMzY2MzI4MzYsNy42MDMzOTcxNyBDNy43MzQ1OTA0Miw3LjkwNzM4OTg5IDguMjY2Mzk5MjQsNy45MDg1OTQzMiA4LjYzNjAzNDQ2LDcuNjA2MjcyNzcgTDE0LjI2NzkyMSwzIEwxLjc4OTY5MzExLDMgWiIgLz4KPC9zdmc+Cg==';
    }

    // Fallback to default icon for other connector types
    return btoa(DEFAULT_CONNECTOR_SVG);
  } catch (error) {
    // console.warn('🔍 Failed to generate icon for', connectorType, ':', error);
    // Fallback to default static icon
    return btoa(DEFAULT_CONNECTOR_SVG);
  }
}
