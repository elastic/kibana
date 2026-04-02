/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { ForkBranchLabel } from '@kbn/esql-utils';
import type { ForkColumnMetaForChangePoint } from './helpers';
import type { DataLayerLike, TimeInterval } from './types';

const CP_ENTITY = 'cp_entity';

export function quoteEsqlIdentifier(id: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    return id;
  }
  return `\`${id.replace(/`/g, '``')}\``;
}

export function escapeEsqlDoubleQuotedString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function timeIntervalToDateTruncUnit(interval: TimeInterval): string {
  const map: Record<TimeInterval, string> = {
    minute: '1 minute',
    hour: '1 hour',
    day: '1 day',
    month: '1 month',
  };
  return map[interval];
}

export function resolveEsqlResultColumnId(
  cols: DatatableColumn[] | undefined,
  alias: string
): string {
  if (!cols?.length) {
    return alias;
  }
  const hit = cols.find((c) => c.id === alias || c.name === alias);
  return hit?.id ?? hit?.name ?? alias;
}

export function buildChangePointEntityEvalPipeline(
  meta: ForkColumnMetaForChangePoint,
  forkBranches: ForkBranchLabel[]
): string | null {
  if (meta.entityColumnByBranchLabel) {
    const col = quoteEsqlIdentifier(meta.entityColumnByBranchLabel);
    return `| EVAL ${CP_ENTITY} = ${col}\n`;
  }
  if (!meta.hasForkColumn || !meta.effectiveForkColumnId) {
    return null;
  }
  const forkQ = quoteEsqlIdentifier(meta.effectiveForkColumnId);
  if (forkBranches.length === 0) {
    return null;
  }
  const caseBranches = forkBranches.flatMap((b) => [
    `cp_fork_idx == ${b.branchIndex}`,
    `"${escapeEsqlDoubleQuotedString(b.branchLabel)}"`,
  ]);
  return (
    `| EVAL cp_fork_idx = case(${forkQ} > 0, ${forkQ} - 1, ${forkQ})\n` +
    `| EVAL ${CP_ENTITY} = case(${caseBranches.join(', ')}, TO_STRING(cp_fork_idx))\n`
  );
}

/** One row per (time bucket, entity) with min p-value; base for burst count-by-bucket. */
export function buildChangePointHeatmapAggregateEsql(params: {
  changePointQueryEsql: string;
  timeColumnId: string;
  pvalueColumnId: string;
  interval: TimeInterval;
  meta: ForkColumnMetaForChangePoint;
  forkBranches: ForkBranchLabel[];
}): string | null {
  const { changePointQueryEsql, timeColumnId, pvalueColumnId, interval, meta, forkBranches } =
    params;
  const inner = changePointQueryEsql.trim();
  if (!inner || !pvalueColumnId) {
    return null;
  }

  const entityPipeline = buildChangePointEntityEvalPipeline(meta, forkBranches);
  if (!entityPipeline) {
    return null;
  }

  const tTime = quoteEsqlIdentifier(timeColumnId);
  const tPval = quoteEsqlIdentifier(pvalueColumnId);
  const trunc = timeIntervalToDateTruncUnit(interval);

  return (
    `FROM (${inner})\n` +
    `| WHERE ${tPval} IS NOT NULL\n` +
    `| EVAL cp_tb = DATE_TRUNC(${trunc}, ${tTime})\n` +
    `${entityPipeline}` +
    `| STATS cp_pvalue = MIN(${tPval}) BY cp_tb, ${CP_ENTITY}`
  );
}

/**
 * Single series per time bucket: count of distinct entities (rows) with a change point in that bucket,
 * after collapsing to one row per (bucket, entity).
 */
export function buildChangePointBurstBarAggregateEsqlUnsplit(params: {
  changePointQueryEsql: string;
  timeColumnId: string;
  pvalueColumnId: string;
  interval: TimeInterval;
  meta: ForkColumnMetaForChangePoint;
  forkBranches: ForkBranchLabel[];
}): string | null {
  const base = buildChangePointHeatmapAggregateEsql(params);
  if (!base) {
    return null;
  }
  return `${base}\n| STATS cp_cnt = COUNT(*) BY cp_tb\n| KEEP cp_tb, cp_cnt`;
}

const BURST_Y_WHOLE_NUMBER_FORMAT = {
  id: 'number',
  params: { decimals: 0 },
} as const;

/** Keep only one text-based datasource layer (matches a single XY data layer). */
function pruneBurstTextBasedDatasourceLayers(
  attributes: TypedLensByValueInput['attributes'],
  keepLayerId: string
): TypedLensByValueInput['attributes'] {
  const textBased = attributes.state.datasourceStates?.textBased as
    | { layers?: Record<string, unknown>; [key: string]: unknown }
    | undefined;
  const layer = textBased?.layers?.[keepLayerId];
  if (!textBased?.layers || !layer) {
    return attributes;
  }
  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...textBased,
          layers: { [keepLayerId]: layer },
        },
      },
    } as unknown as TypedLensByValueInput['attributes']['state'],
  };
}

function withBurstYMetricWholeNumberFormat(
  attributes: TypedLensByValueInput['attributes'],
  yColumnId: string,
  textBasedDataLayerIds: ReadonlySet<string>
): TypedLensByValueInput['attributes'] {
  const textBased = attributes.state.datasourceStates?.textBased as
    | {
        layers?: Record<
          string,
          {
            columns?: Array<{
              columnId: string;
              params?: Record<string, unknown>;
              [key: string]: unknown;
            }>;
            [key: string]: unknown;
          }
        >;
        [key: string]: unknown;
      }
    | undefined;

  if (!textBased?.layers) {
    return attributes;
  }

  const newTextBasedLayers: NonNullable<typeof textBased.layers> = {};
  for (const [layerId, layer] of Object.entries(textBased.layers)) {
    if (!textBasedDataLayerIds.has(layerId)) {
      newTextBasedLayers[layerId] = layer;
      continue;
    }
    newTextBasedLayers[layerId] = {
      ...layer,
      columns: (layer.columns ?? []).map((col) =>
        col.columnId === yColumnId
          ? {
              ...col,
              params: {
                ...(col.params ?? {}),
                format: BURST_Y_WHOLE_NUMBER_FORMAT,
              },
            }
          : col
      ),
    };
  }

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...textBased,
          layers: newTextBasedLayers,
        },
      },
    } as unknown as TypedLensByValueInput['attributes']['state'],
  };
}

/** Vertical bar chart without breakdown (total count per time bucket). */
export function applyBurstBarChartAggregateOnlyToLensAttributes(
  attributes: TypedLensByValueInput['attributes'],
  xColumnId: string,
  yColumnId: string,
  options?: { yTitle?: string }
): TypedLensByValueInput['attributes'] {
  const vis = attributes.state.visualization as {
    layers?: DataLayerLike[];
    preferredSeriesType?: string;
    yTitle?: string;
    [key: string]: unknown;
  };
  if (!vis?.layers?.length) {
    return attributes;
  }

  const isDataLayer = (layer: DataLayerLike) => !layer.layerType || layer.layerType === 'data';
  const dataLayers = vis.layers.filter(isDataLayer);
  const nonDataLayers = vis.layers.filter((layer) => !isDataLayer(layer));
  const primaryData = dataLayers[0] as DataLayerLike & { layerId?: string };
  if (!primaryData?.layerId || typeof primaryData.layerId !== 'string') {
    return attributes;
  }

  const { yConfig: _omitYConfig, ...primaryWithoutYConfig } = primaryData;

  const newLayers: DataLayerLike[] = [
    {
      ...primaryWithoutYConfig,
      layerType: 'data',
      seriesType: 'bar',
      xAccessor: xColumnId,
      accessors: [yColumnId],
      splitAccessors: undefined,
    },
    ...nonDataLayers,
  ];

  const textBasedDataLayerIds = new Set([primaryData.layerId]);

  let next: TypedLensByValueInput['attributes'] = {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...vis,
        preferredSeriesType: 'bar',
        layers: newLayers,
        yLeftExtent: { mode: 'full', niceValues: false },
        ...(options?.yTitle !== undefined ? { yTitle: options.yTitle } : {}),
      },
    } as TypedLensByValueInput['attributes']['state'],
  };

  next = pruneBurstTextBasedDatasourceLayers(next, primaryData.layerId);
  return withBurstYMetricWholeNumberFormat(next, yColumnId, textBasedDataLayerIds);
}
