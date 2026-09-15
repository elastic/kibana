/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License, v 1".
 */

import { Position } from '@elastic/charts';
import { getAccessorByDimension, getFormatByAccessor } from '@kbn/chart-expressions-common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  getDurationUnitFromOutputFormat,
  getDurationUnitInSeconds,
  type SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { isEqual } from 'lodash';
import type {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  CommonXYReferenceLineLayerConfig,
  YAxisConfig,
} from './types';
import {
  groupAxisSeries,
  LEFT_AXIS_GROUP_ID,
  RIGHT_AXIS_GROUP_ID,
  type AxisSeriesDescriptor,
} from './axis_grouping';
import type { AxisFormatPolicy, AxisPolicyMember } from './axis_format_policy_types';
import { isDataLayer, isReferenceLine, isReferenceLineOrLayer } from './utils/layer_types_guards';

const DEFAULT_FORMAT: SerializedFieldFormat = { id: 'number' };
const PERCENT_FORMAT: SerializedFieldFormat = {
  id: 'percent',
  params: { pattern: '0.[00]%' },
};

interface DurationFormatSemantics {
  inputUnit: string;
  outputUnit: string;
}

const getNestedFormat = (format: SerializedFieldFormat): SerializedFieldFormat | undefined => {
  const nested = format.params;
  if (!nested || typeof nested !== 'object' || !('id' in nested)) {
    return;
  }
  return nested as SerializedFieldFormat;
};

const getDurationSemantics = (
  format: SerializedFieldFormat | undefined
): DurationFormatSemantics | undefined => {
  if (!format) {
    return;
  }
  if (format.id !== 'duration') {
    return getDurationSemantics(getNestedFormat(format));
  }

  const inputUnit =
    typeof format.params?.inputFormat === 'string' ? format.params.inputFormat : 'seconds';
  const outputFormat =
    typeof format.params?.outputFormat === 'string' ? format.params.outputFormat : 'humanize';
  const outputUnit = getDurationUnitFromOutputFormat(outputFormat);
  if (
    getDurationUnitInSeconds(inputUnit) === undefined ||
    outputUnit === undefined ||
    getDurationUnitInSeconds(outputUnit) === undefined
  ) {
    return;
  }
  return { inputUnit, outputUnit };
};

const hasDurationFormat = (format: SerializedFieldFormat | undefined): boolean =>
  Boolean(format && (format.id === 'duration' || hasDurationFormat(getNestedFormat(format))));

const setDurationInputUnit = (
  format: SerializedFieldFormat,
  inputUnit: string
): SerializedFieldFormat => {
  if (format.id === 'duration') {
    return {
      ...format,
      params: { ...format.params, inputFormat: inputUnit },
    };
  }
  const nested = getNestedFormat(format);
  if (!nested) {
    return format;
  }
  return {
    ...format,
    params: {
      ...format.params,
      ...setDurationInputUnit(nested, inputUnit),
    },
  };
};

const getColumnFormat = (columns: DatatableColumn[], accessor: string): SerializedFieldFormat =>
  getFormatByAccessor(accessor, columns, DEFAULT_FORMAT) ?? DEFAULT_FORMAT;

const getDimensionFormat = (
  dimension: string | ExpressionValueVisDimension,
  columns: DatatableColumn[]
): SerializedFieldFormat => {
  if (typeof dimension !== 'string' && dimension.format?.id) {
    return dimension.format;
  }
  return getColumnFormat(columns, getAccessorByDimension(dimension, columns));
};

const isDefaultNumberFormat = (format: SerializedFieldFormat): boolean =>
  format.id === 'number' && !format.params?.formatOverride;

const getComparisonFormat = (format: SerializedFieldFormat): SerializedFieldFormat => {
  const duration = getDurationSemantics(format);
  return duration ? setDurationInputUnit(format, '__source_unit__') : format;
};

const getRequestedAxis = (
  layer: CommonXYDataLayerConfig,
  accessor: string,
  yAxisConfigs?: YAxisConfig[]
) => {
  const decoration = layer.decorations?.find(({ forAccessor }) => forAccessor === accessor);
  const axisConfig = yAxisConfigs?.find(
    ({ id }) => decoration?.axisId && id && id === decoration.axisId
  );
  return {
    requestedGroupId: axisConfig?.id ? `axis-${axisConfig.id}` : 'auto',
    requestedGroupPosition: axisConfig?.position,
  };
};

export type DataSeriesDescriptor = AxisSeriesDescriptor & { sourceFormat: SerializedFieldFormat };

const getDataDescriptors = (
  layers: CommonXYDataLayerConfig[],
  yAxisConfigs?: YAxisConfig[]
): DataSeriesDescriptor[] =>
  layers.flatMap((layer) =>
    layer.accessors.map((dimension) => {
      const accessor = getAccessorByDimension(dimension, layer.table.columns);
      const sourceFormat = getDimensionFormat(dimension, layer.table.columns);
      const groupingFormat =
        hasDurationFormat(sourceFormat) && !getDurationSemantics(sourceFormat)
          ? DEFAULT_FORMAT
          : sourceFormat;
      return {
        layerId: layer.layerId,
        accessor,
        fieldFormat: layer.isPercentage ? PERCENT_FORMAT : groupingFormat,
        sourceFormat,
        ...getRequestedAxis(layer, accessor, yAxisConfigs),
      };
    })
  );

const getPolicyPosition = (
  groupId: string,
  yAxisConfigs?: YAxisConfig[]
): typeof Position.Left | typeof Position.Right => {
  if (groupId === RIGHT_AXIS_GROUP_ID) {
    return Position.Right;
  }
  if (groupId === LEFT_AXIS_GROUP_ID) {
    return Position.Left;
  }
  return (yAxisConfigs?.find(({ id }) => id && groupId === `axis-${id}`)?.position ??
    Position.Left) as typeof Position.Left | typeof Position.Right;
};

const getReferencePolicy = (
  policies: AxisFormatPolicy[],
  axisId: string | undefined,
  position: Position | undefined
) =>
  policies.find(
    (policy) =>
      (axisId && policy.groupId === `axis-${axisId}`) ||
      (!axisId && policy.position === (position ?? Position.Left))
  );

const addReferenceMembers = (
  policies: AxisFormatPolicy[],
  referenceLayers: CommonXYReferenceLineLayerConfig[]
) => {
  referenceLayers.forEach((layer) => {
    if (isReferenceLine(layer)) {
      layer.decorations.forEach((decoration) => {
        const policy = getReferencePolicy(policies, decoration.axisId, decoration.position);
        if (!policy) {
          return;
        }
        const format = decoration.valueMeta?.params ?? DEFAULT_FORMAT;
        addMember(policy, layer.layerId, decoration.forAccessor, format, 'reference');
      });
      return;
    }

    layer.decorations?.forEach((decoration) => {
      const policy = getReferencePolicy(policies, decoration.axisId, decoration.position);
      if (!policy) {
        return;
      }
      const format = getColumnFormat(layer.table.columns, decoration.forAccessor);
      addMember(policy, layer.layerId, decoration.forAccessor, format, 'reference');
    });
  });
};

const addMember = (
  policy: AxisFormatPolicy,
  layerId: string,
  accessor: string,
  format: SerializedFieldFormat,
  kind: AxisPolicyMember['kind']
) => {
  const duration = policy.coordinateUnit ? getDurationSemantics(format) : undefined;
  const sourceSeconds = duration ? getDurationUnitInSeconds(duration.inputUnit) : undefined;
  const axisSeconds = policy.coordinateUnit
    ? getDurationUnitInSeconds(policy.coordinateUnit)
    : undefined;
  policy.members.push({
    layerId,
    accessor,
    format,
    kind,
    factor:
      sourceSeconds !== undefined && axisSeconds !== undefined ? sourceSeconds / axisSeconds : 1,
  });
  if (
    policy.formatter.id !== 'percent' &&
    !isDefaultNumberFormat(format) &&
    !(hasDurationFormat(format) && !getDurationSemantics(format)) &&
    !isEqual(getComparisonFormat(format), getComparisonFormat(policy.formatter))
  ) {
    policy.mismatches.push({ layerId, accessor, format });
  }
};

export const resolveAxisFormatPolicies = (
  layers: CommonXYLayerConfig[],
  yAxisConfigs?: YAxisConfig[]
): AxisFormatPolicy[] => {
  const dataLayers = layers.filter(isDataLayer);
  const descriptors = getDataDescriptors(dataLayers, yAxisConfigs);
  const groups = groupAxisSeries(
    descriptors,
    dataLayers.some(({ table }) => Boolean(table))
  );
  const policies = Object.entries(groups)
    .filter(([groupId, group]) => groupId !== 'auto' && group.length)
    .map(([groupId, group]) => {
      const anchor = group[0];
      const anchorDuration = getDurationSemantics(anchor.sourceFormat);
      const validAnchorFormat =
        hasDurationFormat(anchor.fieldFormat) && !anchorDuration
          ? DEFAULT_FORMAT
          : anchor.fieldFormat;
      const formatter =
        validAnchorFormat.id === 'percent' || !anchorDuration
          ? validAnchorFormat
          : setDurationInputUnit(validAnchorFormat, anchorDuration.outputUnit);
      const policy: AxisFormatPolicy = {
        groupId,
        position: getPolicyPosition(groupId, yAxisConfigs),
        anchor: { layerId: anchor.layerId, accessor: anchor.accessor },
        formatter,
        coordinateUnit: anchorDuration?.outputUnit,
        members: [],
        mismatches: [],
        source: 'inferred',
      };
      group.forEach((dataDescriptor) => {
        addMember(
          policy,
          dataDescriptor.layerId,
          dataDescriptor.accessor,
          dataDescriptor.sourceFormat,
          'data'
        );
      });
      return policy;
    });

  addReferenceMembers(policies, layers.filter(isReferenceLineOrLayer));
  return policies;
};

/** Layers with only factor 1 are omitted so applyAxisFormatPolicies can return the input array unchanged. */
const getFactorsByLayer = (policies: AxisFormatPolicy[]) => {
  const factors = new Map<string, Map<string, number>>();
  policies.forEach(({ members }) => {
    members.forEach(({ layerId, accessor, factor }) => {
      if (factor === 1) {
        return;
      }
      const layerFactors = factors.get(layerId) ?? new Map<string, number>();
      layerFactors.set(accessor, factor);
      factors.set(layerId, layerFactors);
    });
  });
  return factors;
};

const scaleTable = (table: Datatable, factors: Map<string, number>): Datatable => ({
  ...table,
  rows: table.rows.map((row) => {
    const scaledRow = { ...row };
    factors.forEach((factor, accessor) => {
      if (typeof row[accessor] === 'number') {
        scaledRow[accessor] = row[accessor] * factor;
      }
    });
    return scaledRow;
  }),
});

export const applyAxisFormatPolicies = <Layer extends CommonXYLayerConfig>(
  layers: Layer[],
  policies: AxisFormatPolicy[]
): Layer[] => {
  const factorsByLayer = getFactorsByLayer(policies);
  if (!factorsByLayer.size) {
    return layers;
  }

  return layers.map((layer) => {
    const factors = factorsByLayer.get(layer.layerId);
    if (!factors) {
      return layer;
    }
    if (isReferenceLine(layer)) {
      return {
        ...layer,
        decorations: layer.decorations.map((decoration) => ({
          ...decoration,
          value:
            typeof decoration.value === 'number'
              ? decoration.value * (factors.get(decoration.forAccessor) ?? 1)
              : decoration.value,
        })),
      } as Layer;
    }
    if ('table' in layer) {
      return {
        ...layer,
        table: scaleTable(layer.table, factors),
      } as Layer;
    }
    return layer;
  });
};
