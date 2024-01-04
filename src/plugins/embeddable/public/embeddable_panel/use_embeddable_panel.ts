/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';

import { IEmbeddable } from '../lib';
import { EmbeddablePanelProps, UnwrappedEmbeddablePanelProps } from './types';
import { untilPluginStartServicesReady } from '../kibana_services';

export type UseEmbeddablePanelResult =
  | {
      unwrappedEmbeddable: IEmbeddable;
      Panel: (props: UnwrappedEmbeddablePanelProps) => JSX.Element;
    }
  | undefined;

export const useEmbeddablePanel = ({
  embeddable,
}: {
  embeddable: EmbeddablePanelProps['embeddable'];
}): UseEmbeddablePanelResult => {
  const { loading, value } = useAsync(async () => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('./embeddable_panel');
    const embeddablePromise =
      typeof embeddable === 'function' ? embeddable() : Promise.resolve(embeddable);
    const [, unwrappedEmbeddable, panelModule] = await Promise.all([
      startServicesPromise,
      embeddablePromise,
      modulePromise,
    ]);
    return { panelModule, unwrappedEmbeddable };
  }, []);

  if (loading || !value?.panelModule || !value?.unwrappedEmbeddable) return;
  return {
    unwrappedEmbeddable: value.unwrappedEmbeddable,
    Panel: value.panelModule.EmbeddablePanel,
  };
};
