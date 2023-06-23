/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';

import { ErrorEmbeddable, IEmbeddable } from '../lib';
import { untilPluginStartServicesReady } from '../kibana_services';
import { EmbeddablePanelProps } from './types';

export type UseEmbeddablePanelResult =
  | {
      unwrappedEmbeddable: IEmbeddable;
      Panel: (props: EmbeddablePanelProps) => JSX.Element;
    }
  | undefined;

export const useEmbeddablePanel = ({
  embeddable,
  getEmbeddable,
}: {
  embeddable?: IEmbeddable;
  getEmbeddable?: () => Promise<IEmbeddable | ErrorEmbeddable>;
}): UseEmbeddablePanelResult => {
  if (!embeddable && !getEmbeddable) {
    throw new Error(
      'useEmbeddable must be run with either an embeddable or a getEmbeddable function'
    );
  }

  const { loading, value } = useAsync(async () => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('./embeddable_panel');
    const embeddablePromise = embeddable ? Promise.resolve(embeddable) : getEmbeddable?.();
    const [, unwrappedEmbeddable, panelModule] = await Promise.all([
      startServicesPromise,
      embeddablePromise,
      modulePromise,
    ]);
    console.log('\n\n\n STUFF IS DONE \n\n');
    return { panelModule, unwrappedEmbeddable };
  }, []);

  if (loading || !value?.panelModule || !value?.unwrappedEmbeddable) return;
  return {
    unwrappedEmbeddable: value.unwrappedEmbeddable,
    Panel: value.panelModule.EmbeddablePanel,
  };
};
