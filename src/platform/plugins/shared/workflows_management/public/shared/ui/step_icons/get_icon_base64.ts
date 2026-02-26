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

type LazyImageComponent = React.LazyExoticComponent<
  React.ComponentType<{ width: number; height: number }>
> & {
  _payload: {
    _result: () => Promise<{ default: React.ComponentType<{ width: number; height: number }> }>;
  };
};

function isLazyExoticComponent(component: unknown): component is LazyImageComponent {
  const comp = component as unknown as LazyImageComponent;
  return typeof comp?._payload?._result === 'function';
}

async function resolveLazyComponent(
  lazyComponent: LazyImageComponent
): Promise<React.ComponentType<{ width: number; height: number }>> {
  const module = await lazyComponent._payload._result();
  return module.default;
}

/**
 * Convert a React component (e.g. SVG) to a data URL.
 * @param component - React component that accepts width/height
 * @param fallbackUrl - Data URL or base64 string to return on error or unsupported output
 */
export function getDataUrlFromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>,
  fallbackUrl: string
): string {
  try {
    const logoElement = React.createElement(component, { width: 16, height: 16 });
    let htmlString = renderToStaticMarkup(logoElement);
    const isImgTag = htmlString.includes('<img');
    if (isImgTag) {
      const srcMatch = htmlString.match(/src="([^"]+)"/);
      if (srcMatch?.[1]?.startsWith('data:')) {
        return srcMatch[1];
      }
      return fallbackUrl;
    }
    const hasFillNone = /fill="none"/i.test(htmlString);
    if (hasFillNone) {
      htmlString = htmlString
        .replaceAll(/fill="none"/gi, '')
        .replace(/<svg([^>]*?)>/, '<svg$1 fill="currentColor">');
    }
    return `data:image/svg+xml;base64,${btoa(htmlString)}`;
  } catch {
    return fallbackUrl;
  }
}

/**
 * Resolve an IconType (data URL string, lazy component, or function component) to a data URL.
 * Returns fallbackUrl when icon is undefined, unsupported, or resolution fails.
 */
export async function resolveIconToDataUrl(
  icon: IconType | undefined,
  fallbackUrl: string
): Promise<string> {
  if (!icon) {
    return fallbackUrl;
  }
  if (typeof icon === 'string' && icon.startsWith('data:')) {
    return icon;
  }
  if (isLazyExoticComponent(icon)) {
    const IconComponent = await resolveLazyComponent(icon);
    return getDataUrlFromReactComponent(IconComponent, fallbackUrl);
  }
  if (typeof icon === 'function') {
    return getDataUrlFromReactComponent(
      icon as React.ComponentType<{ width: number; height: number }>,
      fallbackUrl
    );
  }
  return fallbackUrl;
}

/** Params for resolving a workflow icon (trigger or step) to a data URL. */
export interface GetIconBase64Params {
  actionTypeId: string;
  icon?: IconType;
  fromRegistry?: boolean;
  kind: 'trigger' | 'step';
}

const DEFAULT_CONNECTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
  </svg>`;
const DEFAULT_CONNECTOR_DATA_URL = `data:image/svg+xml;base64,${btoa(DEFAULT_CONNECTOR_SVG)}`;

const triggerIconDataUrlCache = new Map<string, string>();

function defaultFallbackForStep(params: GetIconBase64Params): string {
  if (params.fromRegistry) {
    return HardcodedIcons.kibana;
  }
  return DEFAULT_CONNECTOR_DATA_URL;
}

/**
 * Get data URL for a workflow icon (trigger or step/connector). Uses a cache for triggers so
 * repeated calls reuse the same URL. Fallback for triggers is the bolt icon; for steps it
 * depends on fromRegistry and actionTypeId.
 */
export async function getIconBase64(params: GetIconBase64Params): Promise<string> {
  const { actionTypeId, icon, kind } = params;

  if (kind === 'trigger') {
    if (actionTypeId) {
      const cached = triggerIconDataUrlCache.get(actionTypeId);
      if (cached !== undefined) {
        return cached;
      }
    }
    const setCacheAndReturn = (value: string): string => {
      if (actionTypeId) {
        triggerIconDataUrlCache.set(actionTypeId, value);
      }
      return value;
    };
    try {
      const resolved = await resolveIconToDataUrl(icon, HardcodedIcons.trigger);
      return setCacheAndReturn(resolved);
    } catch {
      return setCacheAndReturn(HardcodedIcons.trigger);
    }
  }

  try {
    if (icon) {
      const fallback = defaultFallbackForStep(params);
      return resolveIconToDataUrl(icon, fallback);
    }
    if (actionTypeId === 'elasticsearch') {
      return getDataUrlFromReactComponent(ElasticsearchLogo, DEFAULT_CONNECTOR_DATA_URL);
    }
    if (actionTypeId === 'kibana') {
      return getDataUrlFromReactComponent(KibanaLogo, DEFAULT_CONNECTOR_DATA_URL);
    }
    const hardcodedIcon = HardcodedIcons[actionTypeId];
    if (hardcodedIcon) {
      return hardcodedIcon;
    }
    return defaultFallbackForStep(params);
  } catch {
    return defaultFallbackForStep(params);
  }
}

/** Sync bolt fallback data URL for default trigger styling (e.g. when async resolution is not needed). */
export function getTriggerBoltFallbackDataUrl(): string {
  return HardcodedIcons.trigger;
}
