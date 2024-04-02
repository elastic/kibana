/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  UnifiedDataTableAdditionalDisplaySettings,
  UnifiedDataTableAdditionalDisplaySettingsProps,
} from './data_table_additional_display_settings';
import lodash from 'lodash';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.spyOn(lodash, 'debounce').mockImplementation((fn: any) => fn);

const renderDisplaySettings = (
  props: Partial<UnifiedDataTableAdditionalDisplaySettingsProps> = {}
) => {
  return render(
    <UnifiedDataTableAdditionalDisplaySettings
      sampleSize={10}
      rowHeight="custom"
      rowHeightLines={10}
      headerRowHeight="custom"
      headerRowHeightLines={5}
      {...props}
    />
  );
};

describe('UnifiedDataTableAdditionalDisplaySettings', function () {
  describe('sampleSize', function () {
    it('should work correctly', async () => {
      const onChangeSampleSizeMock = jest.fn();

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          sampleSize={10}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight="custom"
          rowHeightLines={10}
          headerRowHeight="custom"
          headerRowHeightLines={5}
        />
      );
      const input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(10);

      await act(async () => {
        input.simulate('change', {
          target: {
            value: 100,
          },
        });
      });

      expect(onChangeSampleSizeMock).toHaveBeenCalledWith(100);

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(
        findTestSubject(component, 'unifiedDataTableSampleSizeInput').last().prop('value')
      ).toBe(100);
    });

    it('should not execute the callback for an invalid input', async () => {
      const invalidValue = 600;
      const onChangeSampleSizeMock = jest.fn();

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          maxAllowedSampleSize={500}
          sampleSize={50}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight="custom"
          rowHeightLines={10}
          headerRowHeight="custom"
          headerRowHeightLines={5}
        />
      );
      const input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(50);

      await act(async () => {
        input.simulate('change', {
          target: {
            value: invalidValue,
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(
        findTestSubject(component, 'unifiedDataTableSampleSizeInput').last().prop('value')
      ).toBe(invalidValue);

      expect(onChangeSampleSizeMock).not.toHaveBeenCalled();
    });

    it('should render value changes correctly', async () => {
      const onChangeSampleSizeMock = jest.fn();

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          sampleSize={200}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight="custom"
          rowHeightLines={10}
          headerRowHeight="custom"
          headerRowHeightLines={5}
        />
      );

      expect(
        findTestSubject(component, 'unifiedDataTableSampleSizeInput').last().prop('value')
      ).toBe(200);

      component.setProps({
        sampleSize: 500,
        onChangeSampleSize: onChangeSampleSizeMock,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(
        findTestSubject(component, 'unifiedDataTableSampleSizeInput').last().prop('value')
      ).toBe(500);

      expect(onChangeSampleSizeMock).not.toHaveBeenCalled();
    });
  });

  describe('rowHeight', () => {
    it('should render rowHeight if onChangeRowHeight and onChangeRowHeightLines are defined', () => {
      renderDisplaySettings({
        onChangeRowHeight: jest.fn(),
        onChangeRowHeightLines: jest.fn(),
      });
      expect(screen.getByLabelText('Cell row height')).toBeInTheDocument();
    });

    it('should not render rowHeight if onChangeRowHeight and onChangeRowHeightLines are undefined', () => {
      renderDisplaySettings();
      expect(screen.queryByLabelText('Cell row height')).not.toBeInTheDocument();
    });

    it('should call onChangeRowHeight and onChangeRowHeightLines when the rowHeight changes', () => {
      const onChangeRowHeight = jest.fn();
      const onChangeRowHeightLines = jest.fn();
      renderDisplaySettings({
        rowHeight: 'custom',
        onChangeRowHeight,
        onChangeRowHeightLines,
      });
      fireEvent.change(screen.getByRole('slider', { hidden: true }), { target: { value: 5 } });
      expect(onChangeRowHeightLines).toHaveBeenCalledWith(5);
      userEvent.click(screen.getByRole('button', { name: 'Auto fit' }));
      expect(onChangeRowHeight).toHaveBeenCalledWith('auto');
    });
  });

  describe('headerRowHeight', () => {
    it('should render headerRowHeight if onChangeHeaderRowHeight and onChangeHeaderRowHeightLines are defined', () => {
      renderDisplaySettings({
        onChangeHeaderRowHeight: jest.fn(),
        onChangeHeaderRowHeightLines: jest.fn(),
      });
      expect(screen.getByLabelText('Header row height')).toBeInTheDocument();
    });

    it('should not render headerRowHeight if onChangeHeaderRowHeight and onChangeHeaderRowHeightLines are undefined', () => {
      renderDisplaySettings();
      expect(screen.queryByLabelText('Header row height')).not.toBeInTheDocument();
    });

    it('should call onChangeHeaderRowHeight and onChangeHeaderRowHeightLines when the headerRowHeight changes', () => {
      const onChangeHeaderRowHeight = jest.fn();
      const onChangeHeaderRowHeightLines = jest.fn();
      renderDisplaySettings({
        headerRowHeight: 'custom',
        onChangeHeaderRowHeight,
        onChangeHeaderRowHeightLines,
      });
      fireEvent.change(screen.getByRole('slider', { hidden: true }), { target: { value: 3 } });
      expect(onChangeHeaderRowHeightLines).toHaveBeenCalledWith(3);
      userEvent.click(screen.getByRole('button', { name: 'Auto fit' }));
      expect(onChangeHeaderRowHeight).toHaveBeenCalledWith('auto');
    });
  });
});
