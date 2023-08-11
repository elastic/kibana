/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import React from 'react';
import { DataView, DataViewFieldMap, IIndexPatternFieldList } from '@kbn/data-views-plugin/common';
import { EmbeddableComponent } from '@kbn/lens-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { GroupPreview } from './group_preview';

class EuiSuperDatePickerTestHarness {
  public static get currentCommonlyUsedRange() {
    return screen.queryByTestId('superDatePickerShowDatesButton')?.textContent ?? '';
  }

  // TODO - add assertion with date formatting
  public static get currentRange() {
    if (screen.queryByTestId('superDatePickerShowDatesButton')) {
      // showing a commonly-used range
      return { from: '', to: '' };
    }

    return {
      from: screen.getByTestId('superDatePickerstartDatePopoverButton').textContent,
      to: screen.getByTestId('superDatePickerendDatePopoverButton').textContent,
    };
  }

  static async togglePopover() {
    await userEvent.click(screen.getByRole('button', { name: 'Date quick select' }));
  }

  static async selectCommonlyUsedRange(label: string) {
    if (!screen.queryByText('Commonly used')) await this.togglePopover();

    await userEvent.click(await screen.findByText(label));
  }
}

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
      >
        {}
      </button>
    </div>
  );

  const getEmbeddableTimeRange = () => {
    const serialized = screen.getByTestId('chartTimeRange').textContent;
    return serialized ? JSON.parse(serialized) : null;
  };

  it('updates the chart time range', async () => {
    render(
      <I18nProvider>
        <GroupPreview
          group={group}
          dataViews={[
            {
              id: 'some-id',
              title: 'My Data View',
              fields: {
                getByType: jest.fn(() => []),
              } as unknown as IIndexPatternFieldList & { toSpec: () => DataViewFieldMap },
            } as DataView,
          ]}
          LensEmbeddableComponent={LensEmbeddableComponent}
        />
      </I18nProvider>
    );

    // default
    expect(EuiSuperDatePickerTestHarness.currentCommonlyUsedRange).toBe('Last 15 minutes');
    expect(getEmbeddableTimeRange()).toEqual({ from: 'now-15m', to: 'now' });

    // from time picker
    await EuiSuperDatePickerTestHarness.selectCommonlyUsedRange('Today');

    expect(EuiSuperDatePickerTestHarness.currentCommonlyUsedRange).toBe('Today');
    expect(getEmbeddableTimeRange()).toEqual({ from: 'now/d', to: 'now/d' });

    // from chart brush
    await userEvent.click(screen.getByTestId('brushEnd'));

    expect(EuiSuperDatePickerTestHarness.currentRange).toEqual({
      from: 'Dec 31, 1969 @ 17:00:00.000',
      to: 'Dec 31, 1969 @ 17:00:00.100',
    });
    expect(getEmbeddableTimeRange()).toEqual({
      from: new Date(BRUSH_RANGE[0]).toISOString(),
      to: new Date(BRUSH_RANGE[1]).toISOString(),
    });
  });

  // describe('lens attributes', () => {
  //   const getAttributes = (wrapper: ShallowWrapper) =>
  //     wrapper
  //       .find(LensEmbeddableComponent)
  //       .prop('attributes') as TypedLensByValueInput['attributes'];

  //   const assertDataView = (id: string, attributes: TypedLensByValueInput['attributes']) =>
  //     expect(attributes.references[0].id).toBe(id);

  //   it('uses correct data view', () => {
  //     assertDataView(group.indexPatternId, getAttributes(component));

  //     component.setProps({ group: { ...group, indexPatternId: 'new-id' } });
  //   });

  //   it('supports ad-hoc data view', () => {
  //     const adHocDataView = {
  //       id: 'adhoc-1',
  //       title: 'my-pattern*',
  //       timeFieldName: '@timestamp',
  //       sourceFilters: [],
  //       fieldFormats: {},
  //       runtimeFieldMap: {},
  //       fieldAttrs: {},
  //       allowNoIndex: false,
  //       name: 'My ad-hoc data view',
  //     } as DataViewSpec;

  //     const attributes = getAttributes(
  //       mountComponent({ ...group, indexPatternId: '', dataViewSpec: adHocDataView })
  //     );

  //     expect(attributes.references).toHaveLength(0);
  //     expect(attributes.state.adHocDataViews![adHocDataView.id!]).toEqual(adHocDataView);
  //     expect(attributes.state.internalReferences).toHaveLength(1);
  //     expect(attributes.state.internalReferences![0].id).toBe(adHocDataView.id);
  //   });
  // });
});
