/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type IconType } from '@elastic/eui';
import {
  getConnectorSpecIcon,
  getDataUrlFromReactComponent,
  HardcodedIcons,
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
}

const DEFAULT_CONNECTOR_DATA_URL = HardcodedIcons.default;

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
    const connectorSpecIcon = getConnectorSpecIcon(actionTypeId);
    if (connectorSpecIcon) {
      return resolveIconToDataUrl(connectorSpecIcon, defaultFallbackForStep(params));
    }
    if (icon) {
      return resolveIconToDataUrl(icon, defaultFallbackForStep(params));
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
