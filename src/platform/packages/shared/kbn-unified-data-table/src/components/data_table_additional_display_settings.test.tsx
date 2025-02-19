/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { RowHeightMode } from './row_height_settings';

jest.spyOn(lodash, 'debounce').mockImplementation((fn: any) => fn);

const renderDisplaySettings = (
  props: Partial<UnifiedDataTableAdditionalDisplaySettingsProps> = {}
) => {
  return render(
    <UnifiedDataTableAdditionalDisplaySettings
      sampleSize={10}
      rowHeight={RowHeightMode.custom}
      lineCountInput={10}
      headerRowHeight={RowHeightMode.custom}
      headerLineCountInput={5}
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
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
        />
      );
      const input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(10);
      expect(input.prop('step')).toBe(10);

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
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
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
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
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

    it('should only render integers when a decimal value is provided', async () => {
      const invalidDecimalValue = 6.11;
      const validIntegerValue = 6;

      const onChangeSampleSizeMock = jest.fn();

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          maxAllowedSampleSize={500}
          sampleSize={50}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
        />
      );
      const input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(50);

      await act(async () => {
        input.simulate('change', {
          target: {
            value: invalidDecimalValue,
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      expect(
        findTestSubject(component, 'unifiedDataTableSampleSizeInput').last().prop('value')
      ).toBe(validIntegerValue);
    });

    it('should not fail if sample size is not step of 10', async () => {
      const onChangeSampleSizeMock = jest.fn();

      const customSampleSize = 9995;
      const newSampleSize = 9990;

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          sampleSize={customSampleSize}
          maxAllowedSampleSize={customSampleSize}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
        />
      );

      let input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(customSampleSize);
      expect(input.prop('step')).toBe(1);

      await act(async () => {
        input.simulate('change', {
          target: {
            value: newSampleSize,
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(newSampleSize);
      expect(input.prop('step')).toBe(1);

      expect(onChangeSampleSizeMock).toHaveBeenCalledWith(newSampleSize);
    });

    it('should not fail if sample size is less than 10', async () => {
      const onChangeSampleSizeMock = jest.fn();

      const customSampleSize = 5;
      const newSampleSize = 10;

      const component = mountWithIntl(
        <UnifiedDataTableAdditionalDisplaySettings
          sampleSize={customSampleSize}
          onChangeSampleSize={onChangeSampleSizeMock}
          rowHeight={RowHeightMode.custom}
          lineCountInput={10}
          headerRowHeight={RowHeightMode.custom}
          headerLineCountInput={5}
        />
      );
      let input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(customSampleSize);
      expect(input.prop('step')).toBe(1);

      await act(async () => {
        input.simulate('change', {
          target: {
            value: newSampleSize,
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      component.update();

      input = findTestSubject(component, 'unifiedDataTableSampleSizeInput').last();
      expect(input.prop('value')).toBe(newSampleSize);
      expect(input.prop('step')).toBe(1);

      expect(onChangeSampleSizeMock).toHaveBeenCalledWith(newSampleSize);
    });
  });

  describe('rowHeight', () => {
    it('should render rowHeight if onChangeRowHeight and onChangeRowHeightLines are defined', () => {
      renderDisplaySettings({
        onChangeRowHeight: jest.fn(),
        onChangeRowHeightLines: jest.fn(),
      });
      expect(screen.getByLabelText('Body cell lines')).toBeInTheDocument();
    });

    it('should not render rowHeight if onChangeRowHeight and onChangeRowHeightLines are undefined', () => {
      renderDisplaySettings();
      expect(screen.queryByLabelText('Body cell lines')).not.toBeInTheDocument();
    });

    it('should call onChangeRowHeight and onChangeRowHeightLines when the rowHeight changes', async () => {
      const onChangeRowHeight = jest.fn();
      const onChangeRowHeightLines = jest.fn();
      renderDisplaySettings({
        rowHeight: RowHeightMode.custom,
        onChangeRowHeight,
        onChangeRowHeightLines,
      });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 5 } });
      expect(onChangeRowHeightLines).toHaveBeenCalledWith(5);
      await userEvent.click(screen.getByRole('button', { name: 'Auto' }));
      expect(onChangeRowHeight).toHaveBeenCalledWith('auto');
    });
  });

  describe('headerRowHeight', () => {
    it('should render headerRowHeight if onChangeHeaderRowHeight and onChangeHeaderRowHeightLines are defined', () => {
      renderDisplaySettings({
        onChangeHeaderRowHeight: jest.fn(),
        onChangeHeaderRowHeightLines: jest.fn(),
      });
      expect(screen.getByLabelText('Max header cell lines')).toBeInTheDocument();
    });

    it('should not render headerRowHeight if onChangeHeaderRowHeight and onChangeHeaderRowHeightLines are undefined', () => {
      renderDisplaySettings();
      expect(screen.queryByLabelText('Max header cell lines')).not.toBeInTheDocument();
    });

    it('should call onChangeHeaderRowHeight and onChangeHeaderRowHeightLines when the headerRowHeight changes', async () => {
      const onChangeHeaderRowHeight = jest.fn();
      const onChangeHeaderRowHeightLines = jest.fn();
      renderDisplaySettings({
        headerRowHeight: RowHeightMode.custom,
        onChangeHeaderRowHeight,
        onChangeHeaderRowHeightLines,
      });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 3 } });
      expect(onChangeHeaderRowHeightLines).toHaveBeenCalledWith(3);
      await userEvent.click(screen.getByRole('button', { name: 'Auto' }));
      expect(onChangeHeaderRowHeight).toHaveBeenCalledWith('auto');
    });
  });
});
