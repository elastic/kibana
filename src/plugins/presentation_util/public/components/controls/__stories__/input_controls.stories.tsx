/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';

import uuid from 'uuid';
import { decorators } from './decorators';
import { ControlGroupContainerFactory } from '../control_group/embeddable/control_group_container_factory';
import { EmbeddableFactory } from '../../../../../embeddable/public';
import { InputControlEmbeddable, InputControlInput, InputControlOutput } from '../types';
import { getControlsServiceStub } from './controlsService_stub';

export default {
  title: 'Input Controls',
  description: '',
  decorators,
};

const ControlGroupStoryComponent = () => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const { controlsServiceStub, openFlyout } = getControlsServiceStub();

  useEffect(() => {
    (async () => {
      const factory = new ControlGroupContainerFactory(controlsServiceStub, openFlyout);
      const controlGroupContainerEmbeddable = await factory.create({
        inheritParentState: {
          useQuery: false,
          useFilters: false,
          useTimerange: false,
        },
        controlStyle: 'oneLine',
        id: uuid.v4(),
        panels: {},
      });
      if (controlGroupContainerEmbeddable && embeddableRoot.current) {
        controlGroupContainerEmbeddable.render(embeddableRoot.current);
      }
    })();
  }, [embeddableRoot, controlsServiceStub, openFlyout]);

  return <div ref={embeddableRoot} />;
};

export const ControlGroupStory = () => <ControlGroupStoryComponent />;
