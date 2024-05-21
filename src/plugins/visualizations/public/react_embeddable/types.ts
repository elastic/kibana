/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Reference } from '@kbn/content-management-utils';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { HasEditCapabilities, SerializedTitles } from '@kbn/presentation-publishing';
import { HasVisualizeConfig } from '../embeddable';
import type { VisParams } from '../types';
import type { SerializedVis } from '../vis';

export type VisualizeSerializedState = SerializedTitles & {
  id: string;
  savedVis: SerializedVis<VisParams>;
};

export interface VisualizeSavedObjectState {
  id: string;
  savedObjectId: string;
  references?: Reference[];
}

export const isVisualizeSavedObjectState = (state: unknown): state is VisualizeSavedObjectState => {
  return (
    typeof state !== 'undefined' &&
    (state as VisualizeSavedObjectState).savedObjectId !== undefined &&
    !('savedVis' in (state as VisualizeSavedObjectState))
  );
};

export type VisualizeApi = HasEditCapabilities &
  HasVisualizeConfig &
  DefaultEmbeddableApi<VisualizeSerializedState> & {
    setVis: (vis: SerializedVis<VisParams>) => void;
    subscribeToInitialRender: (listener: () => void) => void;
    openInspector: () => void;
  };
