/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStackConnectorLogo } from '@kbn/stack-connectors-plugin/public/common/logos';
import { ElasticsearchLogo } from './icons/elasticsearch.svg';
import { HARDCODED_ICONS } from './icons/hardcoded_icons';
import { KibanaLogo } from './icons/kibana.svg';

export interface GetStepIconBase64Params {
  actionTypeId: string;
  icon?: IconType;
}

/**
 * Default fallback SVG for unknown connectors
 */
const DEFAULT_CONNECTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  </svg>`;

/**
 * Get data URL for a connector icon (supports SVG, PNG, and other image formats)
 * Returns a full data URL (e.g., "data:image/svg+xml;base64,..." or "data:image/png;base64,...")
 */
export async function getStepIconBase64(connector: GetStepIconBase64Params): Promise<string> {
  try {
    // Only use connector.icon if it's already a data URL
    if (
      connector.icon &&
      typeof connector.icon === 'string' &&
      connector.icon.startsWith('data:')
    ) {
      return connector.icon;
    }

    const connectorType = connector.actionTypeId;
    if (connectorType === 'elasticsearch') {
      return getDataUrlFromReactComponent(ElasticsearchLogo);
    }

    if (connectorType === 'kibana') {
      return getDataUrlFromReactComponent(KibanaLogo);
    }

    // Handle connectors that use EUI built-in icons instead of custom logo components
    if (connectorType === 'slack' || connectorType === 'slack_api') {
      // hardcoded slack logo - convert to data URL if it's just base64
      const slackIcon = HARDCODED_ICONS.slack;
      if (slackIcon.startsWith('data:')) {
        return slackIcon;
      }
      return `data:image/svg+xml;base64,${slackIcon}`;
    }

    if (connectorType in HARDCODED_ICONS) {
      const hardcodedIcon = HARDCODED_ICONS[connectorType as keyof typeof HARDCODED_ICONS];
      if (hardcodedIcon.startsWith('data:')) {
        return hardcodedIcon;
      }
      return `data:image/svg+xml;base64,${hardcodedIcon}`;
    }

    const dotConnectorType = `.${connectorType}`;
    // First, try to get the logo directly from stack connectors
    const LogoComponent = await getStackConnectorLogo(dotConnectorType);
    if (LogoComponent) {
      // LogoComponent is a React component, not an IconType, so handle it separately
      return getDataUrlFromReactComponent(LogoComponent);
    }

    // Fallback to default icon for other connector types
    return `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;
  } catch (error) {
    // Fallback to default static icon
    return `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;
  }
}

/**
 * Convert a React component to a data URL
 * This is a separate function for React components that aren't IconType
 */
function getDataUrlFromReactComponent(
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

        // If it's already a data URL, return it as-is
        if (srcValue.startsWith('data:')) {
          return srcValue;
        }

        // If it's a regular URL/path, we can't easily convert it here
        // Fallback to default
        return `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;
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
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    // Fallback to default SVG on any error
    return `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;
  }
}
