/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import React from 'react';
import {
  DataView,
  DataViewField,
  DataViewFieldMap,
  IIndexPatternFieldList,
} from '@kbn/data-views-plugin/common';
import {
  EmbeddableComponent,
  FieldBasedIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { GroupPreview } from './group_preview';
import { LensByValueInput } from '@kbn/lens-plugin/public/embeddable';
import { DATA_LAYER_ID, DATE_HISTOGRAM_COLUMN_ID, getCurrentTimeField } from './lens_attributes';
import { EuiSuperDatePickerTestHarness } from '@kbn/test-eui-helpers';

describe('group editor preview', () => {
  const annotation = getDefaultManualAnnotation('my-id', 'some-timestamp');

  const group: EventAnnotationGroupConfig = {
    annotations: [annotation],
    description: '',
    tags: [],
    indexPatternId: 'some-id',
    title: 'My group',
    ignoreGlobalFilters: false,
  };

  const BRUSH_RANGE = [0, 100];

  const LensEmbeddableComponent: EmbeddableComponent = (props) => (
    <div>
      <div data-test-subj="chartTimeRange">{JSON.stringify(props.timeRange)}</div>
      <div data-test-subj="chartSearchSessionId">{props.searchSessionId}</div>
      <div data-test-subj="lensAttributes">
        {JSON.stringify((props as LensByValueInput).attributes)}
      </div>
      <button
        data-test-subj="brushEnd"
        onClick={() =>
          props.onBrushEnd?.({
            table: {} as Datatable,
            range: BRUSH_RANGE,
            column: 0,
            preventDefault: jest.fn(),
          })
        }
      />
    </div>
  );

  const getEmbeddableTimeRange = () => {
    const serialized = screen.getByTestId('chartTimeRange').textContent;
    return serialized ? JSON.parse(serialized) : null;
  };

  const getEmbeddableSearchSessionId = () => {
    return screen.getByTestId('chartSearchSessionId').textContent;
  };

  const getLensAttributes = () => {
    const serialized = screen.queryByTestId('lensAttributes')?.textContent;
    return serialized ? JSON.parse(serialized) : null;
  };

  let rerender: (ui: React.ReactElement<any, string | React.JSXElementConstructor<any>>) => void;

  const defaultProps: Parameters<typeof GroupPreview>[0] = {
    group,
    dataViews: [
      {
        id: 'some-id',
        title: 'My Data View',
        timeFieldName: '@timestamp',
        fields: {
          getByType: jest.fn<DataViewField[], []>(() => [
            {
              type: 'date',
              name: '@timestamp',
            } as DataViewField,
            {
              type: 'date',
              name: 'other-time-field',
            } as DataViewField,
          ]),
        } as unknown as IIndexPatternFieldList & { toSpec: () => DataViewFieldMap },
      } as DataView,
      {
        id: 'a-different-id',
        title: 'My Data View',
        timeFieldName: 'other-time-field',
        fields: {
          getByType: jest.fn<DataViewField[], []>(() => [
            {
              type: 'date',
              name: '@timestamp',
            } as DataViewField,
            {
              type: 'date',
              name: 'other-time-field',
            } as DataViewField,
          ]),
        } as unknown as IIndexPatternFieldList & { toSpec: () => DataViewFieldMap },
      } as DataView,
    ],
    LensEmbeddableComponent,
    searchSessionId: 'some-search-session-id',
    refreshSearchSession: jest.fn(),
    timePickerQuickRanges: [{ from: 'now/d', to: 'now/d', display: 'Today' }],
  };

  beforeEach(() => {
    const renderResult = render(
      <I18nProvider>
        <GroupPreview {...defaultProps} />
      </I18nProvider>
    );

    rerender = renderResult.rerender;
  });

  it('updates the chart time range', async () => {
    // default
    expect(EuiSuperDatePickerTestHarness.currentCommonlyUsedRange).toBe('Last 15 minutes');
    expect(getEmbeddableTimeRange()).toEqual({ from: 'now-15m', to: 'now' });

    // from time picker
    await EuiSuperDatePickerTestHarness.selectCommonlyUsedRange('Today');

    expect(EuiSuperDatePickerTestHarness.currentCommonlyUsedRange).toBe('Today');
    expect(getEmbeddableTimeRange()).toEqual({ from: 'now/d', to: 'now/d' });

    // from chart brush
    userEvent.click(screen.getByTestId('brushEnd'));

    EuiSuperDatePickerTestHarness.assertCurrentRange(
      { from: BRUSH_RANGE[0], to: BRUSH_RANGE[1] },
      expect
    );

    expect(getEmbeddableTimeRange()).toEqual({
      from: new Date(BRUSH_RANGE[0]).toISOString(),
      to: new Date(BRUSH_RANGE[1]).toISOString(),
    });
  });

  it('updates the time field', async () => {
    EuiSuperDatePickerTestHarness.togglePopover();

    const select = screen.getByRole('combobox', { name: 'Time field' });

    expect(select).toHaveValue('@timestamp');
    expect(getCurrentTimeField(getLensAttributes())).toBe('@timestamp');

    userEvent.selectOptions(select, 'other-time-field');

    expect(select).toHaveValue('other-time-field');

    await waitFor(() => {
      expect(getCurrentTimeField(getLensAttributes())).toBe('other-time-field');
    });
  });

  it('refreshes the chart data', () => {
    expect(defaultProps.refreshSearchSession).not.toHaveBeenCalled();
    expect(getEmbeddableSearchSessionId()).toBe(defaultProps.searchSessionId);

    EuiSuperDatePickerTestHarness.refresh();

    expect(defaultProps.refreshSearchSession).toHaveBeenCalled();

    rerender(
      <I18nProvider>
        <GroupPreview {...defaultProps} searchSessionId="new-search-session-id" />
      </I18nProvider>
    );

    expect(getEmbeddableSearchSessionId()).toBe('new-search-session-id');
  });

  describe('data views', () => {
    const assertDataView = (id: string, attributes: TypedLensByValueInput['attributes']) =>
      expect(attributes.references[0].id).toBe(id);
    const assertTimeField = (fieldName: string, attributes: TypedLensByValueInput['attributes']) =>
      expect(
        (
          attributes.state.datasourceStates.formBased?.layers[DATA_LAYER_ID].columns[
            DATE_HISTOGRAM_COLUMN_ID
          ] as FieldBasedIndexPatternColumn
        ).sourceField
      ).toBe(fieldName);

    it('uses correct data view', async () => {
      assertDataView(group.indexPatternId, getLensAttributes());

      rerender(
        <I18nProvider>
          <GroupPreview {...defaultProps} group={{ ...group, indexPatternId: 'a-different-id' }} />
        </I18nProvider>
      );

      await waitFor(() => {
        assertDataView('a-different-id', getLensAttributes());
        assertTimeField('other-time-field', getLensAttributes());
      });
    });

    it('supports ad-hoc data view', () => {
      const adHocDataView = {
        id: 'adhoc-1',
        title: 'my-pattern*',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: 'My ad-hoc data view',
      };

      rerender(
        <I18nProvider>
          <GroupPreview
            {...defaultProps}
            group={{ ...group, indexPatternId: '', dataViewSpec: adHocDataView }}
          />
        </I18nProvider>
      );

      waitFor(() => {
        const attributes = getLensAttributes();
        expect(attributes.references).toHaveLength(0);
        expect(attributes.state.adHocDataViews![adHocDataView.id!]).toEqual(adHocDataView);
        expect(attributes.state.internalReferences).toHaveLength(1);
        expect(attributes.state.internalReferences![0].id).toBe(adHocDataView.id);
      });
    });

    it('handles missing data view', async () => {
      rerender(
        <I18nProvider>
          <GroupPreview {...defaultProps} group={{ ...group, indexPatternId: 'doesnt-exist' }} />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Select a valid data view' })
        ).toBeInTheDocument();
      });
      expect(getLensAttributes()).toBeNull(); // chart shouldn't be rendered
    });
  });
});
