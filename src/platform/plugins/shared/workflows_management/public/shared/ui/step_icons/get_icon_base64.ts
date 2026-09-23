/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiThemeColorModeStandard, type IconType } from '@elastic/eui';
import {
  getConnectorSpecIcon,
  getDataUrlFromReactComponent,
  HardcodedIconDataUrls,
  resolveIconToDataUrl,
} from '@kbn/workflows-ui';

import { ElasticsearchLogo } from './icons/elasticsearch.svg';
import { KibanaLogo } from './icons/kibana.svg';

export { getDataUrlFromReactComponent, resolveIconToDataUrl } from '@kbn/workflows-ui';

/** Params for resolving a workflow icon (trigger or step) to a data URL. */
export interface GetIconBase64Params {
  actionTypeId: string;
  icon?: IconType;
  fromRegistry?: boolean;
  kind: 'trigger' | 'step';
  /** The data URL bakes in the resolved fill, so each color mode needs its own. */
  colorMode?: EuiThemeColorModeStandard;
}

const DEFAULT_CONNECTOR_DATA_URL = HardcodedIconDataUrls.default;

const triggerIconDataUrlCache = new Map<string, string>();
const stepIconDataUrlCache = new Map<string, Promise<string>>();

function defaultFallbackForStep(params: GetIconBase64Params): string {
  if (params.fromRegistry) {
    return HardcodedIconDataUrls.kibana;
  }
  return DEFAULT_CONNECTOR_DATA_URL;
}

async function resolveStepIconDataUrl(
  params: GetIconBase64Params,
  colorMode: EuiThemeColorModeStandard
): Promise<string> {
  const { actionTypeId, icon } = params;
  try {
    if (actionTypeId === 'elasticsearch') {
      return getDataUrlFromReactComponent(ElasticsearchLogo, DEFAULT_CONNECTOR_DATA_URL, colorMode);
    }
    if (actionTypeId === 'kibana') {
      return getDataUrlFromReactComponent(KibanaLogo, DEFAULT_CONNECTOR_DATA_URL, colorMode);
    }
    const hardcodedIcon = HardcodedIconDataUrls[actionTypeId];
    if (hardcodedIcon) {
      return hardcodedIcon;
    }
    const connectorSpecIcon = getConnectorSpecIcon(actionTypeId);
    if (connectorSpecIcon) {
      return await resolveIconToDataUrl(
        connectorSpecIcon,
        defaultFallbackForStep(params),
        colorMode
      );
    }
    if (icon) {
      return await resolveIconToDataUrl(icon, defaultFallbackForStep(params), colorMode);
    }
    return defaultFallbackForStep(params);
  } catch {
    return defaultFallbackForStep(params);
  }
}

/**
 * Get data URL for a workflow icon (trigger or step/connector). Caches both kinds so repeated
 * calls reuse the same URL instead of re-running the lazy import and React render. Fallback for
 * triggers is the bolt icon; for steps it depends on fromRegistry and actionTypeId.
 */
export async function getIconBase64(params: GetIconBase64Params): Promise<string> {
  const { actionTypeId, icon, kind, colorMode = 'LIGHT' } = params;

  if (kind === 'trigger') {
    // Keyed by color mode too: the same trigger resolves to a different URL per theme.
    const cacheKey = `${actionTypeId}:${colorMode}`;
    if (actionTypeId) {
      const cached = triggerIconDataUrlCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }
    const setCacheAndReturn = (value: string): string => {
      if (actionTypeId) {
        triggerIconDataUrlCache.set(cacheKey, value);
      }
      return value;
    };
    try {
      const resolved = await resolveIconToDataUrl(icon, HardcodedIconDataUrls.trigger, colorMode);
      return setCacheAndReturn(resolved);
    } catch {
      return setCacheAndReturn(HardcodedIconDataUrls.trigger);
    }
  }

  if (!actionTypeId) {
    return resolveStepIconDataUrl(params, colorMode);
  }
  // The in-flight promise is cached, not just the URL: the YAML editor re-runs icon injection
  // several times per mount, and each uncached step pays a lazy import plus a React render.
  const cacheKey = `${actionTypeId}:${colorMode}:${params.fromRegistry ? 'registry' : 'catalog'}`;
  const cached = stepIconDataUrlCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const resolution = resolveStepIconDataUrl(params, colorMode);
  stepIconDataUrlCache.set(cacheKey, resolution);
  return resolution;
}

/** Sync bolt fallback data URL for default trigger styling (e.g. when async resolution is not needed). */
export function getTriggerBoltFallbackDataUrl(): string {
  return HardcodedIconDataUrls.trigger;
}
