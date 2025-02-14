/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesRendered,
  PublishesTimeRange,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { DeepPartial } from '@kbn/utility-types';
import type { HasVisualizeConfig } from './interfaces/has_visualize_config';
import type { Vis, VisParams, VisSavedObject } from '../types';
import type { SerializedVis } from '../vis';

export type ExtraSavedObjectProperties = Pick<
  VisSavedObject,
  | 'lastSavedTitle'
  | 'displayName'
  | 'getDisplayName'
  | 'getEsType'
  | 'managed'
  | 'sharingSavedObjectProps'
>;

export type VisualizeRuntimeState = SerializedTitles &
  SerializedTimeRange &
  Partial<DynamicActionsSerializedState> & {
    serializedVis: SerializedVis<VisParams>;
    savedObjectId?: string;
    savedObjectProperties?: ExtraSavedObjectProperties;
    linkedToLibrary?: boolean;
  };

export type VisualizeEditorInput = Omit<VisualizeRuntimeState, 'vis'> & {
  savedVis?: SerializedVis<VisParams>;
  timeRange: TimeRange;
  vis?: Vis<VisParams> & { colors?: Record<string, string>; legendOpen?: boolean };
};

export type VisualizeSavedObjectInputState = SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    savedObjectId: string;
    timeRange?: TimeRange;
    uiState?: any;
  };

export type VisualizeSavedVisInputState = SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    savedVis: SerializedVis<VisParams>;
    timeRange?: TimeRange;
  };

export type VisualizeSerializedState = VisualizeSavedObjectInputState | VisualizeSavedVisInputState;
export type VisualizeOutputState = VisualizeSavedVisInputState &
  Required<Omit<SerializedTitles, 'hidePanelTitles'>> &
  ExtraSavedObjectProperties;

export type VisualizeApi = Partial<HasEditCapabilities> &
  PublishesDataViews &
  PublishesDataLoading &
  PublishesRendered &
  HasVisualizeConfig &
  HasInspectorAdapters &
  HasSupportedTriggers &
  PublishesTimeRange &
  HasLibraryTransforms &
  DefaultEmbeddableApi<VisualizeSerializedState, VisualizeRuntimeState> & {
    updateVis: (vis: DeepPartial<SerializedVis<VisParams>>) => void;
    openInspector: () => OverlayRef | undefined;
  };
