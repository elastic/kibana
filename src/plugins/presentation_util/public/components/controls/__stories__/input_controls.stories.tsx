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
import { providers } from '../../../services/storybook';
import { getControlsServiceStub } from './controls_service_stub';
import { ControlGroupContainerFactory } from '../control_group/control_group_container_factory';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

const ControlGroupStoryComponent = () => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  providers.overlays.start({});
  const overlays = providers.overlays.getService();

  const controlsServiceStub = getControlsServiceStub();

  useEffect(() => {
    (async () => {
      const factory = new ControlGroupContainerFactory(controlsServiceStub, overlays);
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
  }, [embeddableRoot, controlsServiceStub, overlays]);

  return <div ref={embeddableRoot} />;
};

export const ControlGroupStory = () => <ControlGroupStoryComponent />;
