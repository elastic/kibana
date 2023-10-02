/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findTestSubject } from '@elastic/eui/lib/test';
import * as React from 'react';
import { EmbeddableOutput, isErrorEmbeddable, ViewMode } from '../lib';
import { coreMock } from '@kbn/core/public/mocks';
import { testPlugin } from './test_plugin';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import {
  EmbeddableTimeRangeInput,
  TimeRangeContainer,
  TimeRangeEmbeddable,
  TimeRangeEmbeddableFactory,
  TIME_RANGE_EMBEDDABLE,
} from '../lib/test_samples';
import { CustomizePanelEditor } from '../embeddable_panel/panel_actions/customize_panel_action/customize_panel_editor';
import { embeddablePluginMock } from '../mocks';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';

let container: TimeRangeContainer;
let embeddable: TimeRangeEmbeddable;

const mockGetFilters = jest.fn(async () => [] as Filter[]);
const mockGetQuery = jest.fn(async () => undefined as Query | AggregateQuery | undefined);

beforeEach(async () => {
  const { doStart, setup } = testPlugin(coreMock.createSetup(), coreMock.createStart());

  const timeRangeFactory = new TimeRangeEmbeddableFactory();
  setup.registerEmbeddableFactory(timeRangeFactory.type, timeRangeFactory);

  const { getEmbeddableFactory } = doStart();

  container = new TimeRangeContainer(
    { id: '123', panels: {}, timeRange: { from: '-7d', to: 'now' } },
    getEmbeddableFactory
  );
  const timeRangeEmbeddable = await container.addNewEmbeddable<
    EmbeddableTimeRangeInput,
    EmbeddableOutput,
    TimeRangeEmbeddable
  >(TIME_RANGE_EMBEDDABLE, {
    id: '4321',
    title: 'A time series',
    description: 'This might be a neat line chart',
    viewMode: ViewMode.EDIT,
  });

  if (isErrorEmbeddable(timeRangeEmbeddable)) {
    throw new Error('Error creating new hello world embeddable');
  } else {
    embeddable = embeddablePluginMock.mockFilterableEmbeddable(timeRangeEmbeddable, {
      getFilters: mockGetFilters,
      getQuery: mockGetQuery,
    });
  }
});

test('Value is initialized with the embeddables title', async () => {
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const descriptionField = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  expect(titleField.props().value).toBe(embeddable.getOutput().title);
  expect(descriptionField.props().value).toBe(embeddable.getOutput().description);
});

test('Calls updateInput with a new title', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');

  expect(updateInput).toBeCalledWith({
    title: 'new title',
  });
});

test('Input value shows custom title if one given', async () => {
  embeddable.updateInput({ title: 'new title' });
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe('new title');
  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');
  expect(inputField.props().value).toBe('new title');
});

test('Reset updates the input values with the default properties when the embeddable has overridden the properties', async () => {
  embeddable.updateInput({ title: 'my custom title', description: 'my custom description' });
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'another custom title' } };
  titleField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  const titleAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(titleAfter.props().value).toBe(embeddable.getOutput().defaultTitle);

  findTestSubject(component, 'resetCustomEmbeddablePanelDescriptionButton').simulate('click');
  const descriptionAfter = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  expect(descriptionAfter.props().value).toBe(embeddable.getOutput().defaultDescription);
});

test('Reset updates the input with the default properties when the embeddable has no property overrides', async () => {
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const titleEvent = { target: { value: 'new title' } };
  titleField.simulate('change', titleEvent);

  const descriptionField = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  const descriptionEvent = { target: { value: 'new description' } };
  titleField.simulate('change', descriptionEvent);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  findTestSubject(component, 'resetCustomEmbeddablePanelDescriptionButton').simulate('click');

  await component.update();
  expect(titleField.props().value).toBe(embeddable.getOutput().defaultTitle);
  expect(descriptionField.props().value).toBe(embeddable.getOutput().defaultDescription);
});

test('Reset title calls updateInput with undefined', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');

  expect(updateInput).toBeCalledWith({
    title: undefined,
  });
});

test('Reset description calls updateInput with undefined', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelDescriptionButton').simulate('click');
  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');

  expect(updateInput).toBeCalledWith({
    description: undefined,
  });
});

test('Can set title and description to an empty string', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor
      embeddable={embeddable}
      timeRangeCompatible={true}
      onClose={() => {}}
      onEdit={() => {}}
    />
  );

  for (const subject of [
    'customEmbeddablePanelTitleInput',
    'customEmbeddablePanelDescriptionInput',
  ]) {
    const inputField = findTestSubject(component, subject);
    const event = { target: { value: '' } };
    inputField.simulate('change', event);
  }

  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');
  const titleFieldAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput');
  const descriptionFieldAfter = findTestSubject(component, 'customEmbeddablePanelDescriptionInput');
  expect(titleFieldAfter.props().value).toBe('');
  expect(descriptionFieldAfter.props().value).toBe('');
  expect(updateInput).toBeCalledWith({ description: '', title: '' });
});
