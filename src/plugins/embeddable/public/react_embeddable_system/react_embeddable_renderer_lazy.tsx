/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { Props } from './react_embeddable_renderer';
import { DefaultEmbeddableApi } from './types';
import { HasSerializedChildState } from '@kbn/presentation-containers';

const Component = dynamic(async () => {
  const { ReactEmbeddableRenderer } = await import('./react_embeddable_renderer');
  return {
    default: ReactEmbeddableRenderer,
  };
});

export function ReactEmbeddableRendererLazy<
SerializedState extends object = object,
RuntimeState extends object = SerializedState,
Api extends DefaultEmbeddableApi<SerializedState, RuntimeState> = DefaultEmbeddableApi<
  SerializedState,
  RuntimeState
>,
ParentApi extends HasSerializedChildState<SerializedState> = HasSerializedChildState<SerializedState>
>(props: Props<SerializedState, RuntimeState, Api, ParentApi>) {
  return <Component<SerializedState, RuntimeState, Api, ParentApi> {...props} />;
}
