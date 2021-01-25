/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Header } from '../header';
import { shallowWithI18nProvider } from '@kbn/test/jest';
import { EuiComboBox } from '@elastic/eui';
import { waitFor } from '@testing-library/react';
const onQueryChanged = jest.fn();
const defaultProps = {
  characterList: '%',
  errors: [],
  goToNextStep: () => {},
  isIncludingSystemIndices: false,
  isNextStepDisabled: false,
  onChangeIncludingSystemIndices: () => {},
  onQueryChanged,
  onTitleChanged: () => {},
  patternError: false,
  selectedPatterns: ['auditbeat-*'],
  title: 'Awesome title',
  titleError: false,
};
describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render normally', () => {
    const component = shallowWithI18nProvider(<Header {...defaultProps} />);
    expect(component.find('[data-test-subj="createIndexPatternTitleInput"]').prop('value')).toEqual(
      defaultProps.title
    );
    expect(
      component.find('[data-test-subj="createIndexPatternListInput"]').prop('selectedOptions')
    ).toEqual([{ label: defaultProps.selectedPatterns[0] }]);
    expect(
      component.find('[data-test-subj="createIndexPatternTitleFormRow"]').prop('error')
    ).toHaveLength(0);
    expect(
      component.find('[data-test-subj="createIndexPatternTitleFormRow"]').prop('isInvalid')
    ).toBeFalsy();
    expect(
      component.find('[data-test-subj="createIndexPatternListFormRow"]').prop('error')
    ).toHaveLength(0);
    expect(
      component.find('[data-test-subj="createIndexPatternListFormRow"]').prop('isInvalid')
    ).toBeFalsy();
    expect(
      component.find('[data-test-subj="createIndexPatternForm"]').prop('isInvalid')
    ).toBeFalsy();
  });

  it('should mark the pattern input as invalid', () => {
    const testProps = {
      ...defaultProps,
      patternError: true,
    };
    const component = shallowWithI18nProvider(<Header {...testProps} />);
    expect(
      component.find('[data-test-subj="createIndexPatternListFormRow"]').prop('error')
    ).toHaveLength(1);
    expect(
      component.find('[data-test-subj="createIndexPatternListFormRow"]').prop('isInvalid')
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="createIndexPatternForm"]').prop('isInvalid')
    ).toBeTruthy();
  });

  it('should mark the title input as invalid', () => {
    const testProps = {
      ...defaultProps,
      titleError: true,
    };
    const component = shallowWithI18nProvider(<Header {...testProps} />);
    expect(
      component.find('[data-test-subj="createIndexPatternTitleFormRow"]').prop('error')
    ).toHaveLength(1);
    expect(
      component.find('[data-test-subj="createIndexPatternTitleFormRow"]').prop('isInvalid')
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="createIndexPatternForm"]').prop('isInvalid')
    ).toBeTruthy();
  });

  it('renders errors when input is invalid onSearchChange', async () => {
    const component = shallowWithI18nProvider(<Header {...defaultProps} />);
    expect(
      component.find('[data-test-subj="createIndexPatternListInput"]').first().prop('isInvalid')
    ).toBeFalsy();
    await waitFor(() => {
      ((component.find(EuiComboBox).first().props() as unknown) as {
        onSearchChange: (a: string) => void;
      }).onSearchChange('?');
    });
    expect(
      component.find('[data-test-subj="createIndexPatternListInput"]').first().prop('isInvalid')
    ).toBeTruthy();
  });

  it('Does submit valid input onCreateOption', async () => {
    const newPattern = 'cool-*';
    const component = shallowWithI18nProvider(<Header {...defaultProps} />);
    await waitFor(() => {
      ((component.find(EuiComboBox).first().props() as unknown) as {
        onCreateOption: (a: string) => void;
      }).onCreateOption(newPattern);
    });
    expect(onQueryChanged).toHaveBeenCalledWith([...defaultProps.selectedPatterns, newPattern]);
  });

  it('Does not submit invalid input onCreateOption', async () => {
    const component = shallowWithI18nProvider(<Header {...defaultProps} />);
    await waitFor(() => {
      ((component.find(EuiComboBox).first().props() as unknown) as {
        onCreateOption: (a: string) => void;
      }).onCreateOption('?');
    });
    expect(onQueryChanged).not.toHaveBeenCalled();
  });
});
