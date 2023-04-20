/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiLoadingChart } from '@elastic/eui';

import { IEmbeddable } from '../lib';
import { EmbeddablePanelProps } from './types';
import { untilPluginStartServicesReady } from '../kibana_services';

/**
 * TODO comment
 */
export const EmbeddablePanelNew = (props: EmbeddablePanelProps) => {
  const result = useEmbeddablePanel({ embeddable: props.embeddable });
  if (!result) return <EmbeddableLoadingIndicator />;
  return <result.Panel {...props} />;
};

/**
 * TODO comment
 */
export const EmbeddablePanelAsync = (
  props: Omit<EmbeddablePanelProps, 'embeddable'> & {
    getEmbeddable: () => Promise<IEmbeddable>;
  }
) => {
  const { getEmbeddable, ...panelProps } = props;
  const result = useEmbeddablePanel({ getEmbeddable });
  if (!result) return <EmbeddableLoadingIndicator />;
  return <result.Panel {...panelProps} embeddable={result.unwrappedEmbeddable} />;
};

const useEmbeddablePanel = ({
  embeddable,
  getEmbeddable,
}: {
  embeddable?: IEmbeddable;
  getEmbeddable?: () => Promise<IEmbeddable>;
}) => {
  const { loading, value } = useAsync(() => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('./embeddable_panel');
    if (!embeddable && !getEmbeddable) {
      throw new Error(
        'useEmbeddable must be run with either an embeddable or a getEmbeddable function'
      );
    }
    const embeddablePromise = embeddable ? Promise.resolve(embeddable) : getEmbeddable?.();
    return Promise.all([startServicesPromise, modulePromise, embeddablePromise]);
  }, [embeddable, getEmbeddable]);

  const panelModule = value?.[1];
  const unwrappedEmbeddable = value?.[2];

  if (loading || !panelModule || !unwrappedEmbeddable) return;
  return { unwrappedEmbeddable, Panel: panelModule.EmbeddablePanel };
};

const EmbeddableLoadingIndicator = () => {
  return <EuiLoadingChart />;
};
