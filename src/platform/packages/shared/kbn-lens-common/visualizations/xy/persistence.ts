/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_LAYER_TYPES } from '../constants';
import type {
  XYByValueAnnotationLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYVisualizationState,
} from './types';

/**
 * This is the type of hybrid layer we get after the user has made a change to
 * a by-reference annotation layer and saved the visualization without
 * first saving the changes to the library annotation layer.
 *
 * We maintain the link to the library annotation group, but allow the users
 * changes (persisted in the visualization state) to override the attributes in
 * the library version until the user
 * - saves the changes to the library annotation group
 * - reverts the changes
 * - unlinks the layer from the library annotation group
 */
export type XYPersistedLinkedByValueAnnotationLayerConfig = Omit<
  XYPersistedByValueAnnotationLayerConfig,
  'persistanceType'
> &
  Omit<XYPersistedByReferenceAnnotationLayerConfig, 'persistanceType'> & {
    persistanceType: 'linked';
  };

export type XYPersistedByValueAnnotationLayerConfig = Omit<
  XYByValueAnnotationLayerConfig,
  'indexPatternId' | 'hide' | 'simpleView'
> & { persistanceType?: 'byValue'; hide?: boolean; simpleView?: boolean }; // props made optional for backwards compatibility since this is how the existing saved objects are

export type XYPersistedByReferenceAnnotationLayerConfig = Pick<
  XYByValueAnnotationLayerConfig,
  'layerId' | 'layerType'
> & {
  persistanceType: 'byReference';
  annotationGroupRef: string;
};

export type XYPersistedAnnotationLayerConfig =
  | XYPersistedByReferenceAnnotationLayerConfig
  | XYPersistedByValueAnnotationLayerConfig
  | XYPersistedLinkedByValueAnnotationLayerConfig;

export type XYPersistedLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYPersistedAnnotationLayerConfig;

export type XYPersistedState = Omit<XYVisualizationState, 'layers'> & {
  layers: XYPersistedLayerConfig[];
  valuesInLegend?: boolean;
};

export const isPersistedByReferenceAnnotationsLayer = (
  layer: XYPersistedAnnotationLayerConfig
): layer is XYPersistedByReferenceAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) && layer.persistanceType === 'byReference';

export const isPersistedLinkedByValueAnnotationsLayer = (
  layer: XYPersistedAnnotationLayerConfig
): layer is XYPersistedLinkedByValueAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) && layer.persistanceType === 'linked';

export const isPersistedAnnotationsLayer = (
  layer: XYPersistedLayerConfig
): layer is XYPersistedAnnotationLayerConfig =>
  layer.layerType === LENS_LAYER_TYPES.ANNOTATIONS && !('indexPatternId' in layer);

export const isPersistedByValueAnnotationsLayer = (
  layer: XYPersistedLayerConfig
): layer is XYPersistedByValueAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) &&
  (layer.persistanceType === 'byValue' || !layer.persistanceType);
