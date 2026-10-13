/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { Serializable } from '@kbn/utility-types';
import type {
  FieldFormatsGetConfigFn,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import {
  baseFormatters,
  FieldFormatsRegistry,
  FORMATS_UI_SETTINGS,
} from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DateFormat, DateNanosFormat } from '@kbn/field-formats-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FormatEditorService } from '../../service';
import { FormatSelectEditor } from './field_format_editor';

const createFieldFormats = (): FieldFormatsStart => {
  const registry = new FieldFormatsRegistry();
  const config: Record<string, Serializable> = {
    'dateFormat:tz': 'UTC',
    [FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP]: {
      ip: { id: 'ip' },
      date: { id: 'date' },
      date_nanos: { id: 'date_nanos', es: true },
      number: { id: 'number' },
      boolean: { id: 'boolean' },
      histogram: { id: 'histogram' },
      _source: { id: '_source' },
      _default_: { id: 'string' },
    },
  };
  const getConfig: FieldFormatsGetConfigFn = (key) => config[key];
  registry.init(getConfig, {}, [...baseFormatters, DateFormat, DateNanosFormat]);
  return registry;
};

const createFieldFormatEditors = () => {
  const service = new FormatEditorService();
  service.setup();
  return service.start().fieldFormatEditors;
};

const FormatSelectEditorHarness = ({ esTypes }: { esTypes: ES_FIELD_TYPES[] }) => {
  const [value, setValue] = useState<SerializedFieldFormat | undefined>();

  return (
    <FormatSelectEditor
      esTypes={esTypes}
      fieldFormatEditors={createFieldFormatEditors()}
      fieldFormats={createFieldFormats()}
      uiSettings={coreMock.createStart().uiSettings}
      onChange={setValue}
      onError={jest.fn()}
      value={value}
    />
  );
};

const renderSelectEditor = (esTypes: ES_FIELD_TYPES[]) =>
  renderWithI18n(<FormatSelectEditorHarness esTypes={esTypes} />);

const getFormatIds = () =>
  within(screen.getByTestId('editorSelectedFormatId'))
    .getAllByRole('option')
    .map((option) => option.getAttribute('value'));

describe('FormatSelectEditor', () => {
  it('can switch between the duration and bytes editors more than once', async () => {
    renderSelectEditor([ES_FIELD_TYPES.LONG]);

    await userEvent.selectOptions(screen.getByTestId('editorSelectedFormatId'), 'duration');
    expect(await screen.findByTestId('durationEditorInputFormat')).toBeVisible();

    await userEvent.selectOptions(screen.getByTestId('editorSelectedFormatId'), 'bytes');
    expect(await screen.findByTestId('numberEditorFormatPattern')).toBeVisible();
    expect(screen.queryByTestId('durationEditorInputFormat')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('editorSelectedFormatId'), 'duration');
    expect(await screen.findByTestId('durationEditorInputFormat')).toBeVisible();
  });

  it('offers the formats that apply to a keyword field', () => {
    renderSelectEditor([ES_FIELD_TYPES.KEYWORD]);

    expect(getFormatIds()).toEqual([
      '',
      'boolean',
      'color',
      'static_lookup',
      'string',
      'truncate',
      'url',
    ]);
  });

  it('offers the date and date_nanos formats for a date_nanos field', () => {
    renderSelectEditor([ES_FIELD_TYPES.DATE_NANOS]);

    expect(getFormatIds()).toEqual(expect.arrayContaining(['', 'date', 'date_nanos']));
  });
});
