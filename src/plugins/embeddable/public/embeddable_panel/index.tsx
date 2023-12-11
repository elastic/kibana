/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { PanelLoader } from '@kbn/panel-loader';
import { EmbeddablePanelProps } from './types';
import { useEmbeddablePanel } from './use_embeddable_panel';

/**
 * Loads and renders an embeddable.
 */
export const EmbeddablePanel = (props: EmbeddablePanelProps) => {
  const result = useEmbeddablePanel({ embeddable: props.embeddable });
  if (!result)
    return (
      <PanelLoader showShadow={props.showShadow} dataTestSubj="embeddablePanelLoadingIndicator" />
    );
  const { embeddable, ...passThroughProps } = props;
  return <result.Panel embeddable={result.unwrappedEmbeddable} {...passThroughProps} />;
};
