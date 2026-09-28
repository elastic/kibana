/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext, HasParentApi, HasUniqueId } from '@kbn/presentation-publishing';
import {
  apiHasParentApi,
  apiHasUniqueId,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { dashboardShareColorMappingActionStrings } from './_dashboard_actions_strings';
import { ACTION_SHARE_COLOR_MAPPING } from './constants';

/** Minimal shape for visualization layers that have color mapping (e.g. Lens XY, partition) */
interface LayerWithColorConfig {
  palette?: unknown;
  colorMapping?: unknown;
}

interface AttributesWithVisualization {
  state?: {
    visualization?: {
      layers?: LayerWithColorConfig[];
    };
  };
}

interface ShareColorMappingParentApi {
  selectedPanelIds$?: { getValue(): Set<string> };
  getChildApi?(id: string): Promise<unknown>;
}

type ShareColorMappingEmbeddableApi = HasUniqueId &
  HasParentApi<ShareColorMappingParentApi> & {
    getFullAttributes?(): AttributesWithVisualization | undefined;
    updateAttributes?(attrs: AttributesWithVisualization): void;
    blockingError$?: { value?: Error };
  };

function isLensWithColorMapping(api: unknown): api is ShareColorMappingEmbeddableApi {
  const a = api as ShareColorMappingEmbeddableApi;
  return (
    apiHasUniqueId(api) &&
    apiHasParentApi(api) &&
    typeof a.getFullAttributes === 'function' &&
    typeof a.updateAttributes === 'function' &&
    typeof (a.parentApi as ShareColorMappingParentApi)?.selectedPanelIds$?.getValue ===
      'function' &&
    typeof (a.parentApi as ShareColorMappingParentApi)?.getChildApi === 'function'
  );
}

function extractColorMappingFromAttributes(
  attributes: AttributesWithVisualization | undefined
): LayerWithColorConfig[] | undefined {
  const layers = attributes?.state?.visualization?.layers;
  if (!Array.isArray(layers) || layers.length === 0) return undefined;
  return layers.map((layer) => ({
    palette: layer.palette,
    colorMapping: layer.colorMapping,
  }));
}

function applyColorMappingToAttributes(
  attributes: AttributesWithVisualization,
  sourceLayerConfigs: LayerWithColorConfig[]
): AttributesWithVisualization {
  const layers = attributes?.state?.visualization?.layers;
  if (!Array.isArray(layers)) return attributes;

  const newLayers = layers.map((layer, i) => {
    const source = sourceLayerConfigs[i];
    if (!source) return layer;
    return {
      ...layer,
      palette: source.palette,
      colorMapping: source.colorMapping,
    };
  });

  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...attributes.state?.visualization,
        layers: newLayers,
      },
    },
  };
}

interface PanelWithColorMapping {
  getFullAttributes(): AttributesWithVisualization | undefined;
  updateAttributes(attrs: AttributesWithVisualization): void;
}

/**
 * Whether a panel can take part in sharing colors: a Lens chart whose visualization has layers
 * with palette / color mapping config.
 */
export function hasColorMapping(api: unknown): api is PanelWithColorMapping {
  const panel = api as Partial<PanelWithColorMapping>;
  if (typeof panel?.getFullAttributes !== 'function') return false;
  if (typeof panel?.updateAttributes !== 'function') return false;
  return Boolean(extractColorMappingFromAttributes(panel.getFullAttributes())?.length);
}

/**
 * Copies the source panel's palette and color mapping onto each target, layer by layer.
 * Targets without color-mapped layers are skipped. Returns how many panels were updated.
 */
export function copyColorMapping(source: unknown, targets: unknown[]): number {
  if (!hasColorMapping(source)) return 0;
  const sourceLayerConfigs = extractColorMappingFromAttributes(source.getFullAttributes());
  if (!sourceLayerConfigs?.length) return 0;

  let updated = 0;
  for (const target of targets) {
    if (target === source || !hasColorMapping(target)) continue;
    const targetAttributes = target.getFullAttributes();
    if (!targetAttributes?.state?.visualization?.layers?.length) continue;
    target.updateAttributes(applyColorMappingToAttributes(targetAttributes, sourceLayerConfigs));
    updated++;
  }
  return updated;
}

export class ShareColorMappingAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_SHARE_COLOR_MAPPING;
  public readonly id = ACTION_SHARE_COLOR_MAPPING;
  public order = 5;
  // No grouping: show at first level of context menu (main panel), not in a sub-level

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!isLensWithColorMapping(embeddable)) throw new IncompatibleActionError();
    return dashboardShareColorMappingActionStrings.getDisplayName();
  }

  public getIconType() {
    return 'palette';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isLensWithColorMapping(embeddable)) return false;
    if (embeddable.blockingError$?.value) return false;
    if (getInheritedViewMode(embeddable) !== 'edit') return false;

    const parent = embeddable.parentApi as ShareColorMappingParentApi;
    const selectedIds = parent.selectedPanelIds$?.getValue();
    return Boolean(selectedIds && selectedIds.size >= 2);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isLensWithColorMapping(embeddable)) throw new IncompatibleActionError();

    const parent = embeddable.parentApi as ShareColorMappingParentApi;
    const selectedIds = parent.selectedPanelIds$?.getValue();
    if (!selectedIds || selectedIds.size < 2 || !parent.getChildApi) return;

    const targets = await Promise.all(
      Array.from(selectedIds)
        .filter((panelId) => panelId !== embeddable.uuid)
        .map((panelId) => parent.getChildApi!(panelId))
    );
    copyColorMapping(embeddable, targets);
  }
}
