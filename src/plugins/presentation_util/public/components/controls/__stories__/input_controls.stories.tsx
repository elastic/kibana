/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState, useCallback, FC } from 'react';
import uuid from 'uuid';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiTextAlign } from '@elastic/eui';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import { decorators } from './decorators';
import { pluginServices, registry } from '../../../services/storybook';
import { populateStorybookControlFactories } from './storybook_control_factories';
import { ControlGroupContainerFactory } from '../control_group/embeddable/control_group_container_factory';
import { ControlsPanels } from '../control_group/types';
import {
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from '../control_types/options_list/options_list_embeddable';
import { ViewMode } from '../control_group/types';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T;
type EmbeddableType = UnwrapPromise<ReturnType<ControlGroupContainerFactory['create']>>;

const EmptyControlGroupStoryComponent: FC<{
  panels?: ControlsPanels;
  edit?: boolean;
}> = ({ panels, edit }) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const [embeddable, setEmbeddable] = useState<EmbeddableType>();
  const [viewMode, setViewMode] = useState<ViewMode>(
    edit === undefined || edit ? ViewMode.EDIT : ViewMode.VIEW
  );

  const handleToggleViewMode = useCallback(() => {
    if (embeddable) {
      const newViewMode =
        embeddable.getInput().viewMode === ViewMode.EDIT ? ViewMode.VIEW : ViewMode.EDIT;
      embeddable.updateInput({ viewMode: newViewMode });
    }
  }, [embeddable]);

  pluginServices.setRegistry(registry.start({}));
  populateStorybookControlFactories(pluginServices.getServices().controls);

  useEffectOnce(() => {
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
        viewMode,
      });

      if (controlGroupContainerEmbeddable && embeddableRoot.current) {
        controlGroupContainerEmbeddable.render(embeddableRoot.current);
      }
      setEmbeddable(controlGroupContainerEmbeddable);
    })();
  });

  useEffect(() => {
    if (embeddable) {
      const subscription = embeddable.getInput$().subscribe((updatedInput) => {
        if (updatedInput.viewMode) {
          setViewMode(updatedInput.viewMode);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [embeddable, setViewMode]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTextAlign textAlign="right">
            <EuiSwitch checked={viewMode === 'edit'} label="Edit" onChange={handleToggleViewMode} />
          </EuiTextAlign>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div ref={embeddableRoot} />
    </>
  );
};

export const EmptyControlGroupStory = () => <EmptyControlGroupStoryComponent edit={false} />;
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
          indexPattern: 'demo data flights',
          field: 'OriginCityName',
          defaultSelections: ['Toronto'],
        } as OptionsListEmbeddableInput,
      },
      optionsList2: {
        type: OPTIONS_LIST_CONTROL,
        order: 2,
        width: 'auto',
        explicitInput: {
          title: 'Destination City',
          id: 'optionsList2',
          indexPattern: 'demo data flights',
          field: 'DestCityName',
          defaultSelections: ['London'],
        } as OptionsListEmbeddableInput,
      },
      optionsList3: {
        type: OPTIONS_LIST_CONTROL,
        order: 3,
        width: 'auto',
        explicitInput: {
          title: 'Carrier',
          id: 'optionsList3',
          indexPattern: 'demo data flights',
          field: 'Carrier',
        } as OptionsListEmbeddableInput,
      },
    }}
  />
);
