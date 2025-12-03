/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type IconType } from '@elastic/eui';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HardcodedIcons } from './hardcoded_icons';
import { ElasticsearchLogo } from './icons/elasticsearch.svg';
import { KibanaLogo } from './icons/kibana.svg';

export interface GetStepIconBase64Params {
  actionTypeId: string;
  icon?: IconType;
  fromRegistry?: boolean;
}

/**
 * Default fallback SVG for unknown connectors
 */
const DEFAULT_CONNECTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  </svg>`;
const DEFAULT_CONNECTOR_DATA_URL = `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;

type LazyImageComponent = React.LazyExoticComponent<
  React.ComponentType<{ width: number; height: number }>
> & {
  _payload: {
    _result: () => Promise<{ default: React.ComponentType<{ width: number; height: number }> }>;
  };
};

/**
 * Type guard to check if a component is a LazyExoticComponent
 * LazyExoticComponent has an internal _payload property with a _load function
 */
function isLazyExoticComponent(component: unknown): component is LazyImageComponent {
  const comp = component as unknown as LazyImageComponent;
  return typeof comp?._payload?._result === 'function';
}

/**
 * Resolve a LazyExoticComponent to its actual component
 * Accesses React's internal _payload._result API to resolve the lazy component
 */
async function resolveLazyComponent(
  lazyComponent: LazyImageComponent
): Promise<React.ComponentType<{ width: number; height: number }>> {
  // Access React's internal payload to get the loader function
  const module = await lazyComponent._payload._result();
  // Return the default export (the actual component)
  return module.default;
}

function defaultIconForConnector(connector: GetStepIconBase64Params): string {
  if (connector.fromRegistry) {
    // default to kibana icon if the step is comes from custom step registry
    return HardcodedIcons.kibana;
  }
  // Fallback to default icon for other connector types
  return DEFAULT_CONNECTOR_DATA_URL;
}

/**
 * Get data URL for a connector icon (supports SVG, PNG, and other image formats)
 * Returns a full data URL (e.g., "data:image/svg+xml;base64,..." or "data:image/png;base64,...")
 */
export async function getStepIconBase64(connector: GetStepIconBase64Params): Promise<string> {
  try {
    // The icon from action registry,
    if (connector.icon) {
      // data URL strings or lazy components supported.
      // built-in EUI icons are not supported (e.g. 'logoSlack', 'inference') use hardcoded icons for them instead.
      if (typeof connector.icon === 'string' && connector.icon.startsWith('data:')) {
        return connector.icon;
      }
      if (isLazyExoticComponent(connector.icon)) {
        const IconComponent = await resolveLazyComponent(connector.icon);
        return getDataUrlFromReactComponent(IconComponent);
      }
      if (typeof connector.icon === 'function') {
        return getDataUrlFromReactComponent(
          connector.icon as React.FC<{ width: number; height: number }>
        );
      }
    }

    if (connector.actionTypeId === 'elasticsearch') {
      return getDataUrlFromReactComponent(ElasticsearchLogo);
    }

    if (connector.actionTypeId === 'kibana') {
      return getDataUrlFromReactComponent(KibanaLogo);
    }

    const hardcodedIcon = HardcodedIcons[connector.actionTypeId];
    if (hardcodedIcon) {
      return hardcodedIcon;
    }

    return defaultIconForConnector(connector);
  } catch (error) {
    return defaultIconForConnector(connector);
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
          .replaceAll(/fill="none"/gi, '')
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
