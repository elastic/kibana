/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField, IIndexPatternFieldList } from '@kbn/data-views-plugin/common';
import AnnotationEditorControls from './annotation_editor_controls';

import React from 'react';
import { mount } from 'enzyme';
import type {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import { QueryInputServices } from '@kbn/visualization-ui-components';
import moment from 'moment';
import { act } from 'react-dom/test-utils';
import { EuiButtonGroup } from '@elastic/eui';

jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => {
    return 'QueryStringInput';
  },
}));

const customLineStaticAnnotation: EventAnnotationConfig = {
  id: 'ann1',
  type: 'manual',
  key: { type: 'point_in_time' as const, timestamp: '2022-03-18T08:25:00.000Z' },
  label: 'Event',
  icon: 'triangle' as const,
  color: 'red',
  lineStyle: 'dashed' as const,
  lineWidth: 3,
};

describe('AnnotationsPanel', () => {
  const mockDataView: DataView = {
    fields: [
      new DataViewField({
        type: 'date',
        name: 'field1',
        searchable: true,
        aggregatable: true,
      }),
      new DataViewField({
        type: 'date',
        name: '@timestamp',
        searchable: true,
        aggregatable: true,
      }),
    ] as unknown as IIndexPatternFieldList,
    getFieldByName: (name) =>
      new DataViewField({ type: 'some-type', name, searchable: true, aggregatable: true }),
    timeFieldName: '@timestamp',
  } as Partial<DataView> as DataView;

  const mockQueryInputServices = {
    http: {},
    uiSettings: {},
    storage: {},
    dataViews: {},
    unifiedSearch: {},
    docLinks: {},
    notifications: {},
    data: {},
  } as QueryInputServices;

  describe('Dimension Editor', () => {
    test('shows correct options for line annotations', () => {
      const component = mount(
        <AnnotationEditorControls
          annotation={customLineStaticAnnotation}
          onAnnotationChange={() => {}}
          dataView={{} as DataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-time"]').prop('selected')
      ).toEqual(moment('2022-03-18T08:25:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-fromTime"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-toTime"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiSwitch[data-test-subj="lns-xyAnnotation-rangeSwitch"]').prop('checked')
      ).toEqual(false);
      expect(component.find('EuiFieldText[data-test-subj="name-input"]').prop('value')).toEqual(
        'Event'
      );
      expect(
        component.find('EuiComboBox[data-test-subj="lns-icon-select"]').prop('selectedOptions')
      ).toEqual([{ label: 'Triangle', value: 'triangle' }]);
      expect(component.find('TextDecorationSetting').exists()).toBeTruthy();
      expect(component.find('LineStyleSettings').exists()).toBeTruthy();
      expect(
        component.find('EuiButtonGroup[data-test-subj="lns-xyAnnotation-fillStyle"]').exists()
      ).toBeFalsy();
    });
    test('shows correct options for range annotations', () => {
      const rangeAnnotation: EventAnnotationConfig = {
        color: 'red',
        icon: 'triangle',
        id: 'ann1',
        type: 'manual',
        isHidden: undefined,
        key: {
          endTimestamp: '2022-03-21T10:49:00.000Z',
          timestamp: '2022-03-18T08:25:00.000Z',
          type: 'range',
        },
        label: 'Event range',
        lineStyle: 'dashed',
        lineWidth: 3,
      };

      const component = mount(
        <AnnotationEditorControls
          annotation={rangeAnnotation}
          onAnnotationChange={() => {}}
          dataView={{} as DataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-fromTime"]').prop('selected')
      ).toEqual(moment('2022-03-18T08:25:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-toTime"]').prop('selected')
      ).toEqual(moment('2022-03-21T10:49:00.000Z'));
      expect(
        component.find('EuiDatePicker[data-test-subj="lns-xyAnnotation-time"]').exists()
      ).toBeFalsy();
      expect(
        component.find('EuiSwitch[data-test-subj="lns-xyAnnotation-rangeSwitch"]').prop('checked')
      ).toEqual(true);
      expect(component.find('EuiFieldText[data-test-subj="name-input"]').prop('value')).toEqual(
        'Event range'
      );
      expect(component.find('EuiComboBox[data-test-subj="lns-icon-select"]').exists()).toBeFalsy();
      expect(component.find('TextDecorationSetting').exists()).toBeFalsy();
      expect(component.find('LineStyleSettings').exists()).toBeFalsy();
      expect(component.find('[data-test-subj="lns-xyAnnotation-fillStyle"]').exists()).toBeTruthy();
    });

    test('calculates correct endTimstamp and transparent color when switching for range annotation and back', async () => {
      const onAnnotationChange = jest.fn();
      const rangeEndTimestamp = new Date().toISOString();
      const component = mount(
        <AnnotationEditorControls
          annotation={customLineStaticAnnotation}
          onAnnotationChange={onAnnotationChange}
          dataView={{} as DataView}
          getDefaultRangeEnd={() => rangeEndTimestamp}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      component.find('button[data-test-subj="lns-xyAnnotation-rangeSwitch"]').simulate('click');

      const expectedRangeAnnotation: RangeEventAnnotationConfig = {
        color: '#FF00001A',
        id: 'ann1',
        isHidden: undefined,
        label: 'Event range',
        type: 'manual',
        key: {
          endTimestamp: rangeEndTimestamp,
          timestamp: '2022-03-18T08:25:00.000Z',
          type: 'range',
        },
      };

      expect(onAnnotationChange).toBeCalledWith<EventAnnotationConfig[]>(expectedRangeAnnotation);

      act(() => {
        component.setProps({ annotation: expectedRangeAnnotation });
      });

      expect(
        component.find('EuiSwitch[data-test-subj="lns-xyAnnotation-rangeSwitch"]').prop('checked')
      ).toEqual(true);

      component.find('button[data-test-subj="lns-xyAnnotation-rangeSwitch"]').simulate('click');

      expect(onAnnotationChange).toBeCalledWith<EventAnnotationConfig[]>({
        color: '#FF0000',
        id: 'ann1',
        isHidden: undefined,
        key: {
          timestamp: '2022-03-18T08:25:00.000Z',
          type: 'point_in_time',
        },
        label: 'Event',
        type: 'manual',
      });
    });

    test('shows correct options for query based', () => {
      const annotation: EventAnnotationConfig = {
        color: 'red',
        icon: 'triangle',
        id: 'ann1',
        type: 'query',
        isHidden: undefined,
        timeField: 'timestamp',
        key: {
          type: 'point_in_time',
        },
        label: 'Query based event',
        lineStyle: 'dashed',
        lineWidth: 3,
        filter: { type: 'kibana_query', query: '', language: 'kuery' },
      };

      const component = mount(
        <AnnotationEditorControls
          annotation={annotation}
          onAnnotationChange={() => {}}
          dataView={mockDataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      expect(
        component.find('[data-test-subj="lnsXY-annotation-query-based-field-picker"]').exists()
      ).toBeTruthy();
      expect(
        component.find('[data-test-subj="annotation-query-based-query-input"]').exists()
      ).toBeTruthy();

      // The provided indexPattern has 2 date fields
      expect(
        component
          .find('[data-test-subj="lnsXY-annotation-query-based-field-picker"]')
          .at(0)
          .prop('options')
      ).toHaveLength(2);
      // When in query mode a new "field" option is added to the previous 2 ones
      expect(
        component.find('[data-test-subj="lns-lineMarker-text-visibility"]').at(0).prop('options')
      ).toHaveLength(3);
      expect(
        component.find('[data-test-subj="lnsXY-annotation-tooltip-add_field"]').exists()
      ).toBeTruthy();
    });

    test('should prefill timeField with the default time field when switching to query based annotations', () => {
      const onAnnotationChange = jest.fn();

      const component = mount(
        <AnnotationEditorControls
          annotation={customLineStaticAnnotation}
          onAnnotationChange={onAnnotationChange}
          dataView={mockDataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.objectContaining({ timeField: '@timestamp' })
      );
    });

    test('should avoid to retain specific manual configurations when switching to query based annotations', () => {
      const onAnnotationChange = jest.fn();

      const component = mount(
        <AnnotationEditorControls
          annotation={customLineStaticAnnotation}
          onAnnotationChange={onAnnotationChange}
          dataView={mockDataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.not.objectContaining({ timestamp: expect.any('string') }),
        })
      );
    });

    test('should avoid to retain range manual configurations when switching to query based annotations', () => {
      const annotation: EventAnnotationConfig = {
        color: 'red',
        icon: 'triangle',
        id: 'ann1',
        type: 'manual',
        isHidden: undefined,
        key: {
          endTimestamp: '2022-03-21T10:49:00.000Z',
          timestamp: '2022-03-18T08:25:00.000Z',
          type: 'range',
        },
        label: 'Event range',
        lineStyle: 'dashed',
        lineWidth: 3,
      };

      const onAnnotationChange = jest.fn();

      const component = mount(
        <AnnotationEditorControls
          annotation={annotation}
          onAnnotationChange={onAnnotationChange}
          dataView={mockDataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.objectContaining({ label: expect.not.stringContaining('Event range') })
      );
    });

    test('should set a default tiemstamp when switching from query based to manual annotations', () => {
      const annotation: EventAnnotationConfig = {
        color: 'red',
        icon: 'triangle',
        id: 'ann1',
        type: 'query',
        isHidden: undefined,
        timeField: 'timestamp',
        key: {
          type: 'point_in_time',
        },
        label: 'Query based event',
        lineStyle: 'dashed',
        lineWidth: 3,
        filter: { type: 'kibana_query', query: '', language: 'kuery' },
      };

      const onAnnotationChange = jest.fn();

      const component = mount(
        <AnnotationEditorControls
          annotation={annotation}
          onAnnotationChange={onAnnotationChange}
          dataView={mockDataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_manual');
      });
      component.update();

      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          key: { type: 'point_in_time', timestamp: expect.any(String) },
        })
      );

      // also check query specific props are not carried over
      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.not.objectContaining({ timeField: 'timestamp' })
      );
    });

    test('should fallback to the first date field available in the dataView if not time-based', () => {
      const onAnnotationChange = jest.fn();
      const component = mount(
        <AnnotationEditorControls
          annotation={customLineStaticAnnotation}
          onAnnotationChange={onAnnotationChange}
          dataView={{ ...mockDataView, timeFieldName: '' } as DataView}
          getDefaultRangeEnd={() => ''}
          queryInputServices={mockQueryInputServices}
          appName="myApp"
        />
      );

      act(() => {
        component
          .find(`[data-test-subj="lns-xyAnnotation-placementType"]`)
          .find(EuiButtonGroup)
          .prop('onChange')!('lens_xyChart_annotation_query');
      });
      component.update();

      expect(onAnnotationChange).toHaveBeenCalledWith(
        expect.objectContaining({ timeField: 'field1' })
      );
    });
  });
});
