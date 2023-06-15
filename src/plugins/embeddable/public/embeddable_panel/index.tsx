/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EmbeddablePanelProps } from './types';
import { ErrorEmbeddable, IEmbeddable } from '../lib';
import { useEmbeddablePanel } from './use_embeddable_panel';
import { EmbeddableLoadingIndicator } from './embeddable_loading_indicator';

/**
 * Loads and renders an embeddable.
 */
export const EmbeddablePanel = (props: EmbeddablePanelProps) => {
  const result = useEmbeddablePanel({ embeddable: props.embeddable });
  if (!result) return <EmbeddableLoadingIndicator />;
  return <result.Panel {...props} />;
};

/**
 * Loads and renders an embeddable which can be loaded asynchronously.
 */
export const EmbeddablePanelAsync = (
  props: Omit<EmbeddablePanelProps, 'embeddable'> & {
    getEmbeddable: () => Promise<IEmbeddable | ErrorEmbeddable>;
  }
) => {
  const { getEmbeddable, ...panelProps } = props;
  const result = useEmbeddablePanel({ getEmbeddable });
  if (!result) return <EmbeddableLoadingIndicator showShadow={panelProps.showShadow} />;
  return <result.Panel {...panelProps} embeddable={result.unwrappedEmbeddable} />;
};
