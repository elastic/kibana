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

function getDataUrlFromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>,
  fallbackUrl: string = HardcodedIcons.trigger
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

/** Params for resolving a trigger's icon to a data URL. */
export interface TriggerIconParams {
  actionTypeId: string;
  icon?: IconType;
}

/**
 * Cache resolved trigger icon data URLs so re-runs (e.g. when hovering in the actions menu)
 * reuse the same URLs instead of re-resolving lazy components.
 */
const triggerIconDataUrlCache = new Map<string, string>();

/**
 * Get data URL for a trigger icon. Uses a cache so repeated calls (e.g. on effect re-run) return
 * the same result. Fallback is the bolt icon when resolution fails.
 */
export async function getTriggerIconBase64(trigger: TriggerIconParams): Promise<string> {
  const { actionTypeId, icon } = trigger;

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
    if (icon) {
      if (typeof icon === 'string' && icon.startsWith('data:')) {
        return setCacheAndReturn(icon);
      }
      if (isLazyExoticComponent(icon)) {
        const IconComponent = await resolveLazyComponent(icon);
        return setCacheAndReturn(
          getDataUrlFromReactComponent(IconComponent, HardcodedIcons.trigger)
        );
      }
      if (typeof icon === 'function') {
        return setCacheAndReturn(
          getDataUrlFromReactComponent(
            icon as React.ComponentType<{ width: number; height: number }>,
            HardcodedIcons.trigger
          )
        );
      }
    }
  } catch {
    // Fall through to bolt fallback
  }

  return setCacheAndReturn(HardcodedIcons.trigger);
}

/**
 * Sync bolt fallback data URL for default trigger styling (e.g. when async resolution is not needed).
 */
export function getTriggerBoltFallbackDataUrl(): string {
  return HardcodedIcons.trigger;
}
