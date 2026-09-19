/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeColorModeStandard, IconType } from '@elastic/eui';
import { EuiThemeProvider } from '@elastic/eui';
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

/**
 * Renders an icon component to a data URL for a CSS `background-image` / `mask-image`.
 *
 * `colorMode` is explicit because this renders outside the React tree, where a brand
 * icon's `useEuiTheme()` would read EUI's default context and bake the light fill into
 * every URL. Callers that aren't theme-aware keep the light default.
 */
export function getDataUrlFromReactComponent(
  Component: ImageComponent,
  fallbackUrl: string,
  colorMode: EuiThemeColorModeStandard = 'LIGHT'
): string {
  try {
    let htmlString = renderToStaticMarkup(
      <EuiThemeProvider colorMode={colorMode}>
        <Component width={16} height={16} />
      </EuiThemeProvider>
    );
    if (htmlString.includes('<img')) {
      const srcMatch = htmlString.match(/src="([^"]+)"/);
      if (srcMatch?.[1]) {
        return srcMatch[1];
      }
      return fallbackUrl;
    }
    // A glyph whose root is `fill="none"` paints nothing as a data URL, so drop the
    // `none`s and inherit `currentColor` from the root instead. Skipped when the root
    // already has a real fill: there a child's `fill="none"` is deliberate, and a second
    // root `fill` is a fatal `image/svg+xml` parse error — the browser drops the icon
    // with no warning.
    const rootHasPaintableFill = /<svg[^>]*\sfill="(?!none)[^"]+"/i.test(htmlString);
    if (!rootHasPaintableFill && /fill="none"/i.test(htmlString)) {
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
  fallbackUrl: string,
  colorMode: EuiThemeColorModeStandard = 'LIGHT'
): Promise<string> {
  if (!icon) {
    return fallbackUrl;
  }
  if (typeof icon === 'string') {
    return icon.startsWith('data:') ? icon : fallbackUrl;
  }
  if (isLazyExoticComponent(icon)) {
    const Component = await resolveLazyComponent(icon);
    return getDataUrlFromReactComponent(Component, fallbackUrl, colorMode);
  }
  if (typeof icon === 'function') {
    return getDataUrlFromReactComponent(icon as ImageComponent, fallbackUrl, colorMode);
  }
  return fallbackUrl;
}
