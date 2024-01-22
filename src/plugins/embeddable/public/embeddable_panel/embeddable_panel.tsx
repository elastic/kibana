/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { PresentationPanel } from '@kbn/presentation-panel-plugin/public';
import { PanelCompatibleComponent } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import { isPromise } from '@kbn/std';
import React, { ReactNode, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { untilPluginStartServicesReady } from '../kibana_services';
import { EmbeddablePanelProps } from './types';

const getComponentFromEmbeddable = async (
  embeddable: EmbeddablePanelProps['embeddable']
): Promise<PanelCompatibleComponent> => {
  const startServicesPromise = untilPluginStartServicesReady();
  const embeddablePromise =
    typeof embeddable === 'function' ? embeddable() : Promise.resolve(embeddable);
  const [, unwrappedEmbeddable] = await Promise.all([startServicesPromise, embeddablePromise]);
  if (unwrappedEmbeddable.parent) {
    await unwrappedEmbeddable.parent.untilEmbeddableLoaded(unwrappedEmbeddable.id);
  }

  return React.forwardRef((props, apiRef) => {
    const [node, setNode] = useState<ReactNode | undefined>();
    const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

    // Render legacy embeddable into ref, and destroy on unmount.
    useEffect(() => {
      if (!embeddableRoot.current) return;
      const nextNode = unwrappedEmbeddable.render(embeddableRoot.current) ?? undefined;
      if (isPromise(nextNode)) {
        nextNode.then((resolved) => setNode(resolved));
      } else {
        setNode(nextNode);
      }
      return () => {
        unwrappedEmbeddable.destroy();
      };
    }, [embeddableRoot]);

    useImperativeHandle(apiRef, () => unwrappedEmbeddable);

    return (
      <div css={css(`width: 100%; height: 100%; display:flex`)} ref={embeddableRoot}>
        {node}
      </div>
    );
  });
};

/**
 * Loads and renders a legacy embeddable.
 */
export const EmbeddablePanel = (props: EmbeddablePanelProps) => {
  const { embeddable, ...passThroughProps } = props;
  const componentPromise = useMemo(() => getComponentFromEmbeddable(embeddable), [embeddable]);
  return <PresentationPanel {...passThroughProps} Component={componentPromise} />;
};
