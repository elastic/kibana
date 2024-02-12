/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { PresentationPanel } from '@kbn/presentation-panel-plugin/public';
import React, { useMemo } from 'react';
import { getReactEmbeddableFactory } from './react_embeddable_registry';

/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 *
 * TODO: Rename this to simply `Embeddable` when the legacy Embeddable system is removed.
 */
export const ReactEmbeddableRenderer = ({
  uuid,
  type,
  state,
}: {
  uuid?: string;
  type: string;
  state: SerializedPanelState;
}) => {
  const componentPromise = useMemo(
    () =>
      (async () => {
        const factory = getReactEmbeddableFactory(type);
        return await factory.getComponent(factory.deserializeState(state), uuid);
      })(),
    /**
     * Disabling exhaustive deps because we do not want to re-fetch the component
     * from the embeddable registry unless the type changes.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type]
  );
  return <PresentationPanel Component={componentPromise} />;
};
