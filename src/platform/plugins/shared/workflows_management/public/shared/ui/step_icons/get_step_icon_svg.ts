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
 * Get SVG string for a connector type (for use with mask-image)
 */
export async function getStepIconSvg(connectorType: string): Promise<string> {
  try {
    const dotConnectorType = `.${connectorType}`;
    const LogoComponent = await getStackConnectorLogo(dotConnectorType);
    if (LogoComponent) {
      return getSvgFromReactComponent(LogoComponent);
    }

    if (connectorType === 'elasticsearch') {
      return getSvgFromReactComponent(ElasticsearchLogo);
    }

    if (connectorType === 'kibana') {
      return getSvgFromReactComponent(KibanaLogo);
    }

    if (connectorType === 'slack' || connectorType === 'slack_api') {
      return atob(HARDCODED_ICONS.slack);
    }

    if (connectorType in HARDCODED_ICONS) {
      return atob(HARDCODED_ICONS[connectorType as keyof typeof HARDCODED_ICONS]);
    }

    return DEFAULT_CONNECTOR_SVG;
  } catch (error) {
    return DEFAULT_CONNECTOR_SVG;
  }
}

function getSvgFromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>
): string {
  try {
    const logoElement = React.createElement(component, { width: 16, height: 16 });
    let htmlString = renderToStaticMarkup(logoElement);

    const isImgTag = htmlString.includes('<img');

    if (isImgTag) {
      const srcMatch = htmlString.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        const srcValue = srcMatch[1];

        if (srcValue.startsWith('data:image/svg+xml;base64,')) {
          return atob(srcValue.replace('data:image/svg+xml;base64,', ''));
        }

        if (srcValue.startsWith('data:image/svg+xml,')) {
          return decodeURIComponent(srcValue.replace('data:image/svg+xml,', ''));
        }
      }
      // Fallback if we can't extract SVG from img
      return DEFAULT_CONNECTOR_SVG;
    }

    // Direct SVG - ensure fill="currentColor" is removed for mask-image usage
    htmlString = htmlString.replace(/\s*fill="[^"]*"/gi, '').replace(/\s*fill='[^']*'/gi, '');

    return htmlString;
  } catch (error) {
    return DEFAULT_CONNECTOR_SVG;
  }
}
