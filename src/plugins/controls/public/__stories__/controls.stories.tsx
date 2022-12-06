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

import {
  getFlightOptionsAsync,
  getFlightSearchOptions,
  storybookFlightsDataView,
} from '@kbn/presentation-util-plugin/public/mocks';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import {
  ControlGroupContainerFactory,
  OptionsListEmbeddableInput,
  RangeSliderEmbeddableInput,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '..';

import { decorators } from './decorators';
import { ControlsPanels } from '../control_group/types';
import { ControlGroupContainer } from '../control_group';
import { pluginServices, registry } from '../services/plugin_services.story';
import { injectStorybookDataView } from '../services/data_views/data_views.story';
import { replaceOptionsListMethod } from '../services/options_list/options_list.story';
import { populateStorybookControlFactories } from './storybook_control_factories';
import { replaceValueSuggestionMethod } from '../services/unified_search/unified_search.story';
import { OptionsListResponse, OptionsListRequest } from '../../common/options_list/types';

export default {
  title: 'Controls',
  description: '',
  decorators,
};

injectStorybookDataView(storybookFlightsDataView);
replaceValueSuggestionMethod(getFlightOptionsAsync);

const storybookStubOptionsListRequest = async (
  request: OptionsListRequest,
  abortSignal: AbortSignal
) =>
  new Promise<OptionsListResponse>((r) =>
    setTimeout(
      () =>
        r({
          suggestions: getFlightSearchOptions(request.field.name, request.searchString),
          totalCardinality: 100,
        }),
      120
    )
  );
replaceOptionsListMethod(storybookStubOptionsListRequest);

export const ControlGroupStoryComponent: FC<{
  panels?: ControlsPanels;
  edit?: boolean;
}> = ({ panels, edit }) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const [embeddable, setEmbeddable] = useState<ControlGroupContainer>();
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
        chainingSystem: 'NONE', // a chaining system doesn't make sense in storybook since the controls aren't backed by elasticsearch
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
        width: 'small',
        grow: true,
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
        width: 'medium',
        grow: true,
        explicitInput: {
          title: 'Destination City',
          id: 'optionsList2',
          dataViewId: 'demoDataFlights',
          fieldName: 'DestCityName',
          selectedOptions: ['London'],
        } as OptionsListEmbeddableInput,
      },
      optionsList3: {
        type: 'TIME_SLIDER',
        order: 3,
        width: 'large',
        grow: true,
        explicitInput: {
          title: 'Carrier',
          id: 'optionsList3',
          dataViewId: 'demoDataFlights',
          fieldName: 'Carrier',
        } as OptionsListEmbeddableInput,
      },
      rangeSlider1: {
        type: RANGE_SLIDER_CONTROL,
        order: 4,
        width: 'medium',
        grow: true,
        explicitInput: {
          id: 'rangeSlider1',
          title: 'Average ticket price',
          dataViewId: 'demoDataFlights',
          fieldName: 'AvgTicketPrice',
          value: ['4', '12'],
          step: 2,
        } as RangeSliderEmbeddableInput,
      },
    }}
  />
);

export const RangeSliderControlGroupStory = () => (
  <ControlGroupStoryComponent
    panels={{
      rangeSlider1: {
        type: RANGE_SLIDER_CONTROL,
        order: 1,
        width: 'medium',
        grow: true,
        explicitInput: {
          id: 'rangeSlider1',
          title: 'Average ticket price',
          dataViewId: 'demoDataFlights',
          fieldName: 'AvgTicketPrice',
          value: ['4', '12'],
          step: 2,
        } as RangeSliderEmbeddableInput,
      },
      rangeSlider2: {
        type: RANGE_SLIDER_CONTROL,
        order: 2,
        width: 'medium',
        grow: true,
        explicitInput: {
          id: 'rangeSlider2',
          title: 'Total distance in miles',
          dataViewId: 'demoDataFlights',
          fieldName: 'DistanceMiles',
          value: ['0', '100'],
          step: 10,
        } as RangeSliderEmbeddableInput,
      },
      rangeSlider3: {
        type: RANGE_SLIDER_CONTROL,
        order: 3,
        width: 'medium',
        grow: true,
        explicitInput: {
          id: 'rangeSlider3',
          title: 'Flight duration in hour',
          dataViewId: 'demoDataFlight',
          fieldName: 'FlightTimeHour',
          value: ['30', '600'],
          step: 30,
        } as RangeSliderEmbeddableInput,
      },
    }}
  />
);
