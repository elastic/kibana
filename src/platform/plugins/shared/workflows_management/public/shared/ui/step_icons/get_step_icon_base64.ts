/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStackConnectorLogo } from '@kbn/stack-connectors-plugin/public/common/logos';
import { ElasticsearchLogo } from './icons/elasticsearch.svg';
import { HARDCODED_ICONS } from './icons/hardcoded_icons';
import { KibanaLogo } from './icons/kibana.svg';

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
export async function getStepIconBase64(connectorType: string): Promise<string> {
  try {
    const dotConnectorType = `.${connectorType}`;
    // First, try to get the logo directly from stack connectors
    const LogoComponent = await getStackConnectorLogo(dotConnectorType);
    if (LogoComponent) {
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
  try {
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
  } catch (error) {
    // Fallback to default SVG on any error
    return btoa(DEFAULT_CONNECTOR_SVG);
  }
}
