/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { getKbnPalettes } from '@kbn/palettes';

import {
  CategoricalColorMapping,
  ColorMappingInputCategoricalData,
  ColorMappingInputData,
  ColorMappingProps,
} from './categorical_color_mapping';
import { DEFAULT_COLOR_MAPPING_CONFIG } from './config/default_color_mapping';

const ASSIGNMENTS_LIST = 'lns-colorMapping-assignmentsList';
const ASSIGNMENTS_PROMPT = 'lns-colorMapping-assignmentsPrompt';
const ASSIGNMENTS_PROMPT_ADD_ALL = 'lns-colorMapping-assignmentsPromptAddAll';
const ASSIGNMENT_ITEM = (i: number) => `lns-colorMapping-assignmentsItem${i}`;

const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
const specialTokens = new Map([
  ['__other__', 'Other'],
  ['__empty__', '(Empty)'],
  ['', '(Empty)'],
]);
const categoryData: ColorMappingInputCategoricalData = {
  type: 'categories',
  categories: ['categoryA', 'categoryB'],
};
const mockFormatter = fieldFormatsServiceMock.createStartContract().deserialize();

describe('color mapping', () => {
  let defaultProps: ColorMappingProps;

  mockFormatter.convert = jest.fn(
    (v: any) => (typeof v === 'string' ? specialTokens.get(v) ?? v : JSON.stringify(v)) // simple way to check formatting is applied
  );
  const onModelUpdateFn = jest.fn();

  beforeEach(() => {
    defaultProps = {
      data: categoryData,
      isDarkMode: false,
      model: { ...DEFAULT_COLOR_MAPPING_CONFIG },
      palettes,
      onModelUpdate: onModelUpdateFn,
      specialTokens,
      formatter: mockFormatter,
    };
  });

  const renderCategoricalColorMapping = (props: Partial<ColorMappingProps> = {}) => {
    return render(<CategoricalColorMapping {...defaultProps} {...props} />);
  };

  it('load a default color mapping', () => {
    renderCategoricalColorMapping();

    // empty list prompt visible
    expect(screen.getByTestId(ASSIGNMENTS_PROMPT)).toBeInTheDocument();
    expect(onModelUpdateFn).not.toHaveBeenCalled();
  });

  it('Add all terms to assignments', () => {
    renderCategoricalColorMapping();

    fireEvent.click(screen.getByTestId(ASSIGNMENTS_PROMPT_ADD_ALL));

    expect(onModelUpdateFn).toHaveBeenCalledTimes(1);
    const assignmentsList = screen.getByTestId(ASSIGNMENTS_LIST);
    expect(assignmentsList.children.length).toEqual(categoryData.categories.length);

    categoryData.categories.forEach((category, index) => {
      const assignment = screen.getByTestId(ASSIGNMENT_ITEM(index));
      expect(assignment).toHaveTextContent(String(category));
      expect(assignment).not.toHaveClass('euiComboBox-isDisabled');
    });
  });

  it('handle special tokens, multi-fields keys and non-trimmed whitespaces', () => {
    const data: ColorMappingInputData = {
      type: 'categories',
      categories: [
        '__other__',
        '__empty__',
        '',
        '   with-whitespaces   ',
        { type: 'multiFieldKey', keys: ['gz', 'CN'] },
        { type: 'rangeKey', from: 0, to: 1000, ranges: [{ from: 0, to: 1000, label: '' }] },
      ],
    };
    renderCategoricalColorMapping({ data });

    fireEvent.click(screen.getByTestId(ASSIGNMENTS_PROMPT_ADD_ALL));

    const assignmentsList = screen.getByTestId(ASSIGNMENTS_LIST);
    expect(assignmentsList.children.length).toEqual(data.categories.length);

    expect(screen.getByTestId(ASSIGNMENT_ITEM(0))).toHaveTextContent('Other');
    expect(screen.getByTestId(ASSIGNMENT_ITEM(1))).toHaveTextContent('(Empty)');
    expect(screen.getByTestId(ASSIGNMENT_ITEM(2))).toHaveTextContent('(Empty)');
    expect(screen.getByTestId(ASSIGNMENT_ITEM(3))).toHaveTextContent('   with-whitespaces   ', {
      normalizeWhitespace: false,
    });
    expect(screen.getByTestId(ASSIGNMENT_ITEM(4))).toHaveTextContent('{"keys":["gz","CN"]}');
    expect(screen.getByTestId(ASSIGNMENT_ITEM(5))).toHaveTextContent(
      '{"gte":0,"lt":1000,"label":""}'
    );
  });
});
