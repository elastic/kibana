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
import { pluginServices, registry } from '../../../services/storybook';
import { populateStorybookControlFactories } from './storybook_control_factories';
import { ControlGroupContainerFactory } from '../control_group/embeddable/control_group_container_factory';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

const EmptyControlGroupStoryComponent = () => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  pluginServices.setRegistry(registry.start({}));
  populateStorybookControlFactories(pluginServices.getServices().controls);

  useEffect(() => {
    (async () => {
      const factory = new ControlGroupContainerFactory();
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
  }, [embeddableRoot]);

  return <div ref={embeddableRoot} />;
};

export const EmptyControlGroupStory = () => <EmptyControlGroupStoryComponent />;
