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
import { ControlsPanels } from '../control_group/types';
import {
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from '../control_types/options_list/options_list_embeddable';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

const EmptyControlGroupStoryComponent = ({ panels }: { panels?: ControlsPanels }) => {
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
        panels: panels ?? {},
        id: uuid.v4(),
      });
      if (controlGroupContainerEmbeddable && embeddableRoot.current) {
        controlGroupContainerEmbeddable.render(embeddableRoot.current);
      }
    })();
  }, [embeddableRoot, panels]);

  return <div ref={embeddableRoot} />;
};

export const EmptyControlGroupStory = () => <EmptyControlGroupStoryComponent />;
export const ConfiguredControlGroupStory = () => (
  <EmptyControlGroupStoryComponent
    panels={{
      optionsList1: {
        type: OPTIONS_LIST_CONTROL,
        order: 1,
        width: 'auto',
        explicitInput: {
          title: 'Origin City',
          id: 'optionsList1',
          indexPattern: {
            title: 'demo data flights',
          },
          field: {
            name: 'OriginCityName',
            type: 'string',
            aggregatable: true,
          },
          selectedOptions: ['Toronto'],
        } as OptionsListEmbeddableInput,
      },
      optionsList2: {
        type: OPTIONS_LIST_CONTROL,
        order: 2,
        width: 'auto',
        explicitInput: {
          title: 'Destination City',
          id: 'optionsList2',
          indexPattern: {
            title: 'demo data flights',
          },
          field: {
            name: 'DestCityName',
            type: 'string',
            aggregatable: true,
          },
          selectedOptions: ['London'],
        } as OptionsListEmbeddableInput,
      },
      optionsList3: {
        type: OPTIONS_LIST_CONTROL,
        order: 3,
        width: 'auto',
        explicitInput: {
          title: 'Carrier',
          id: 'optionsList3',
          indexPattern: {
            title: 'demo data flights',
          },
          field: {
            name: 'Carrier',
            type: 'string',
            aggregatable: true,
          },
        } as OptionsListEmbeddableInput,
      },
    }}
  />
);
