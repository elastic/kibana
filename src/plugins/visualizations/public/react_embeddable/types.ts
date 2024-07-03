/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { HasEditCapabilities, SerializedTitles } from '@kbn/presentation-publishing';
import { DeepPartial } from '@kbn/utility-types';
import { HasVisualizeConfig } from '../embeddable';
import type { Vis, VisParams, VisSavedObject } from '../types';
import type { SerializedVis } from '../vis';
import { NavigateToLensFn } from '../visualize_app/utils/use/use_embeddable_api_handler';

export type ExtraSavedObjectProperties = Pick<
  VisSavedObject,
  'lastSavedTitle' | 'displayName' | 'getDisplayName' | 'getEsType' | 'managed'
>;

export type VisualizeRuntimeState = SerializedTitles & {
  vis: Vis<VisParams>;
  savedObjectId?: string;
  savedObjectProperties?: ExtraSavedObjectProperties;
};

export type VisualizeEditorInput = Omit<VisualizeRuntimeState, 'vis'> & {
  savedVis?: SerializedVis<VisParams>;
  timeRange: TimeRange;
  vis?: Vis<VisParams> & { colors?: Record<string, string>; legendOpen?: boolean };
};

export type VisualizeSavedObjectInputState = SerializedTitles & {
  savedObjectId: string;
};

export type VisualizeSavedVisInputState = SerializedTitles & {
  savedVis: SerializedVis<VisParams>;
};

export type VisualizeSerializedState = VisualizeSavedObjectInputState | VisualizeSavedVisInputState;
export type VisualizeOutputState = VisualizeSavedVisInputState &
  Required<Omit<SerializedTitles, 'hidePanelTitles'>> &
  ExtraSavedObjectProperties;

export const isVisualizeSavedObjectState = (
  state: unknown
): state is VisualizeSavedObjectInputState => {
  return (
    typeof state !== 'undefined' &&
    (state as VisualizeSavedObjectInputState).savedObjectId !== undefined &&
    !('savedVis' in (state as VisualizeSavedObjectInputState))
  );
};

export type VisualizeApi = HasEditCapabilities &
  HasVisualizeConfig &
  DefaultEmbeddableApi<VisualizeSerializedState, VisualizeRuntimeState> & {
    updateVis: (vis: DeepPartial<SerializedVis<VisParams>>) => void;
    subscribeToInitialRender: (listener: () => void) => void;
    subscribeToVisData: (listener: (data: unknown) => void) => void;
    subscribeToHasInspector: (listener: (hasInspector: boolean) => void) => void;
    subscribeToNavigateToLens: (listener: (navigateFn: NavigateToLensFn) => void) => void;
    openInspector: () => OverlayRef | undefined;
    saveToLibrary: (title: string) => string;
    canLinkToLibrary: () => boolean;
    canUnlinkFromLibrary: () => boolean;
    checkForDuplicateTitle: (title: string) => boolean;
    getByValueState: () => VisualizeSerializedState;
    getByReferenceState: (id: string) => Promise<VisualizeRuntimeState>;
    getTitles: () => SerializedTitles;
  };
