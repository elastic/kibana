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

export type ImageComponent = React.ComponentType<{ width: number; height: number }>;

interface LazyImageComponent extends React.LazyExoticComponent<ImageComponent> {
  _payload: {
    _result:
      | (() => Promise<{ default: ImageComponent }>)
      | Promise<{ default: ImageComponent }>
      | { default: ImageComponent };
  };
}

function isLazyExoticComponent(component: unknown): component is LazyImageComponent {
  const comp = component as LazyImageComponent | undefined;
  return comp?.$$typeof === Symbol.for('react.lazy') && comp?._payload?._result !== undefined;
}

async function resolveLazyComponent(lazyComponent: LazyImageComponent): Promise<ImageComponent> {
  const result = lazyComponent._payload._result;
  const module = typeof result === 'function' ? await result() : await result;
  return module.default;
}

export function getDataUrlFromReactComponent(
  component: ImageComponent,
  fallbackUrl: string
): string {
  try {
    const element = React.createElement(component, { width: 16, height: 16 });
    let htmlString = renderToStaticMarkup(element);
    if (htmlString.includes('<img')) {
      const srcMatch = htmlString.match(/src="([^"]+)"/);
      if (srcMatch?.[1]) {
        return srcMatch[1];
      }
      return fallbackUrl;
    }
    if (/fill="none"/i.test(htmlString)) {
      htmlString = htmlString
        .replaceAll(/fill="none"/gi, '')
        .replace(/<svg([^>]*?)>/, '<svg$1 fill="currentColor">');
    }
    return `data:image/svg+xml;base64,${btoa(htmlString)}`;
  } catch {
    return fallbackUrl;
  }
}

export async function resolveIconToDataUrl(
  icon: IconType | undefined,
  fallbackUrl: string
): Promise<string> {
  if (!icon) {
    return fallbackUrl;
  }
  if (typeof icon === 'string') {
    return icon.startsWith('data:') ? icon : fallbackUrl;
  }
  if (isLazyExoticComponent(icon)) {
    const Component = await resolveLazyComponent(icon);
    return getDataUrlFromReactComponent(Component, fallbackUrl);
  }
  if (typeof icon === 'function') {
    return getDataUrlFromReactComponent(icon as ImageComponent, fallbackUrl);
  }
  return fallbackUrl;
}
