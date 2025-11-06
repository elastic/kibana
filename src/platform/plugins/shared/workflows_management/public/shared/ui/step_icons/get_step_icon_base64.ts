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

/**
 * Get base64 encoded SVG icon for a connector type
 */
export async function getStepIconBase64(connectorType: string): Promise<string | null> {
  try {
    const dotConnectorType = `.${connectorType}`;
    // First, try to get the logo directly from stack connectors
    const LogoComponent = await getStackConnectorLogo(dotConnectorType);
    if (LogoComponent) {
      return getBase64FromReactComponent(LogoComponent);
    }

    return null;
  } catch (error) {
    return null;
  }
}

function getBase64FromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>
): string | null {
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

    return btoa(htmlString);
  } catch (error) {
    return null;
  }
}
