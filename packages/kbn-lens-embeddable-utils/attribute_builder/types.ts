/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormBasedPersistedState,
  MetricVisualizationState,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYState,
  FormulaPublicApi,
  XYLayerConfig,
  FillStyle,
} from '@kbn/lens-plugin/public';

export type LensAttributes = TypedLensByValueInput['attributes'];

// Attributes
export type LensVisualizationState = XYState | MetricVisualizationState;

export interface VisualizationAttributesBuilder {
  build(): LensAttributes;
}

// Column
export interface BaseChartColumn<TValueConfig extends StaticValueConfig | FormulaValueConfig> {
  getValueConfig(): TValueConfig;
}

export interface ChartColumn extends BaseChartColumn<FormulaValueConfig> {
  getData(
    id: string,
    baseLayer: PersistedIndexPatternLayer,
    dataView: DataView,
    formulaAPI: FormulaPublicApi
  ): PersistedIndexPatternLayer;
}

export interface StaticChartColumn extends BaseChartColumn<StaticValueConfig> {
  getData(id: string, baseLayer: PersistedIndexPatternLayer): PersistedIndexPatternLayer;
}

// Layer
export type LensLayerConfig = XYLayerConfig | MetricVisualizationState;

export interface ChartLayer<TLayerConfig extends LensLayerConfig> {
  getName(): string | undefined;
  getLayer(
    layerId: string,
    accessorId: string,
    dataView: DataView,
    formulaAPI: FormulaPublicApi
  ): FormBasedPersistedState['layers'];
  getReference(layerId: string, dataView: DataView): SavedObjectReference[];
  getLayerConfig(layerId: string, acessorId: string): TLayerConfig;
  getDataView(): DataView | undefined;
}

export interface Chart<TVisualizationState extends LensVisualizationState> {
  getTitle(): string;
  getVisualizationType(): string;
  getLayers(): FormBasedPersistedState['layers'];
  getVisualizationState(): TVisualizationState;
  getReferences(): SavedObjectReference[];
  getDataViews(): DataView[];
}

// Chart
export interface ChartConfig<
  TLayer extends ChartLayer<LensLayerConfig> | Array<ChartLayer<LensLayerConfig>>
> {
  formulaAPI: FormulaPublicApi;
  dataView: DataView;
  layers: TLayer;
  title?: string;
}

// Formula
type LensFormula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];
export type FormulaValueConfig = Omit<LensFormula, 'formula'> & {
  color?: string;
  value: string;
};

export type StaticValueConfig = Omit<LensFormula, 'formula'> & {
  color?: string;
  fill?: FillStyle;
  value: string;
};

export type VisualizationTypes = 'lnsXY' | 'lnsMetric';
