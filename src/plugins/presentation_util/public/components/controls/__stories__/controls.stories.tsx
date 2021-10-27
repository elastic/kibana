/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiTextAlign } from '@elastic/eui';
import React, { useEffect, useMemo, useState, useCallback, FC } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';

import uuid from 'uuid';
import { decorators } from './decorators';
import { ControlsPanels } from '../control_group/types';
import { ViewMode } from '../../../../../embeddable/public';
import { getFlightOptionsAsync, storybookFlightsDataView } from './fixtures/flights';
import { pluginServices, registry } from '../../../services/storybook';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from '../../..';
import { replaceValueSuggestionMethod } from '../../../services/storybook/data';
import { injectStorybookDataView } from '../../../services/storybook/data_views';
import { populateStorybookControlFactories } from './storybook_control_factories';
import { EmbeddablePersistableStateService } from '../../../../../embeddable/common';
import { ControlGroupContainerFactory } from '../control_group/embeddable/control_group_container_factory';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T;
type EmbeddableType = UnwrapPromise<ReturnType<ControlGroupContainerFactory['create']>>;

injectStorybookDataView(storybookFlightsDataView);
replaceValueSuggestionMethod(getFlightOptionsAsync);

const ControlGroupStoryComponent: FC<{
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
      const factory = new ControlGroupContainerFactory(
        {} as unknown as EmbeddablePersistableStateService
      );
      const controlGroupContainerEmbeddable = await factory.create({
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
      <br />

      <div ref={embeddableRoot} />
    </>
  );
};

export const EmptyControlGroupStory = () => <ControlGroupStoryComponent edit={false} />;
export const ConfiguredControlGroupStory = () => (
  <ControlGroupStoryComponent
    panels={{
      optionsList1: {
        type: OPTIONS_LIST_CONTROL,
        order: 1,
        width: 'auto',
        explicitInput: {
          title: 'Origin City',
          id: 'optionsList1',
          dataViewId: 'demoDataFlights',
          fieldName: 'OriginCityName',
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
          dataViewId: 'demoDataFlights',
          fieldName: 'DestCityName',
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
          dataViewId: 'demoDataFlights',
          fieldName: 'Carrier',
        } as OptionsListEmbeddableInput,
      },
    }}
  />
);
