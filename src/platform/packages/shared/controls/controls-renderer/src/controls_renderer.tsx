/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState } from '@kbn/presentation-containers';
import type { ControlState } from '@kbn/controls-schemas';

export const ControlsRenderer = ({
  parentApi,
  getInitialState,
}: {
  parentApi: HasSerializedChildState<object>;
  getInitialState: () => {
    [controlId: string]: ControlState;
  };
}) => {
  return Object.values(getInitialState()).map((control) => (
    <EmbeddableRenderer
      key={control.id}
      maybeId={control.id}
      type={control.type}
      getParentApi={() => parentApi}
      onApiAvailable={(api) => {
        // console.log('REFIST', parentApi.registerChildApi);
        parentApi.registerChildApi(api);
      }}
      hidePanelChrome
    />
  ));
};
