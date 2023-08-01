/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EmbeddablePanelProps } from './types';
import { useEmbeddablePanel } from './use_embeddable_panel';
import { EmbeddableLoadingIndicator } from './embeddable_loading_indicator';

/**
 * Loads and renders an embeddable.
 */
export const EmbeddablePanel = (props: EmbeddablePanelProps) => {
  const result = useEmbeddablePanel({ embeddable: props.embeddable });
  if (!result) return <EmbeddableLoadingIndicator />;
  const { embeddable, ...passThroughProps } = props;
  return <result.Panel embeddable={result.unwrappedEmbeddable} {...passThroughProps} />;
};
