/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Footer } from './footer';

const onSubmit = jest.fn();
const props = {
  onCancel: jest.fn(),
  onSubmit,
  submitDisabled: false,
  submittingType: undefined,
  hasEditData: true,
  allowAdHoc: false,
  isPersisted: true,
  canSave: true,
  isManaged: false,
  isDuplicating: false,
};

const SAVE_AS_AD_HOC_BUTTON_TEST_ID = 'exploreIndexPatternButton';
const SAVE_AS_PERSISTED_BUTTON_TEST_ID = 'saveIndexPatternButton';
const DUPLICATE_BUTTON_TEST_ID = 'duplicateButton';

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create new dataview', () => {
    it('renders footer buttons correctly', () => {
      const { getByTestId, queryByTestId } = render(<Footer {...props} hasEditData={false} />);
      expect(getByTestId('closeFlyoutButton')).toBeInTheDocument();
      expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent(
        'Save data view to Kibana'
      );
      expect(queryByTestId(DUPLICATE_BUTTON_TEST_ID)).not.toBeInTheDocument();

      fireEvent.click(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID));
      expect(onSubmit).toHaveBeenCalledWith(false);
    });

    it('renders Use without saving button when allowAdHoc is true', () => {
      const { getByTestId } = render(<Footer {...props} hasEditData={false} allowAdHoc={true} />);

      expect(getByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).toHaveTextContent('Use without saving');
      expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent(
        'Save data view to Kibana'
      );

      fireEvent.click(getByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID));
      expect(onSubmit).toHaveBeenCalledWith(true);
    });

    it('does not render any save buttons when canSave is false', () => {
      const { queryByTestId } = render(<Footer {...props} hasEditData={false} canSave={false} />);
      expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(DUPLICATE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('Editing an unmanaged dataview', () => {
    describe('ad hoc dataview', () => {
      it('renders Continue to use without saving button', () => {
        const { getByTestId, queryByTestId } = render(<Footer {...props} isPersisted={false} />);
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toBeInTheDocument();
        expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent(
          'Continue to use without saving'
        );
        expect(queryByTestId(DUPLICATE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      });

      it('renders duplicate button when onDuplicate is provided', () => {
        const onDuplicate = jest.fn();
        const { getByTestId, queryByTestId } = render(
          <Footer {...props} isPersisted={false} onDuplicate={onDuplicate} />
        );
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent(
          'Continue to use without saving'
        );
        expect(getByTestId(DUPLICATE_BUTTON_TEST_ID)).toBeInTheDocument();

        fireEvent.click(getByTestId(DUPLICATE_BUTTON_TEST_ID));
        expect(onDuplicate).toHaveBeenCalled();
      });
    });

    describe('persisted dataview', () => {
      it('renders save button', () => {
        const { getByTestId, queryByTestId } = render(<Footer {...props} isPersisted={true} />);
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toBeInTheDocument();
        expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent('Save');
      });
    });

    it('renders duplicate button when onDuplicate is provided', () => {
      const onDuplicate = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <Footer {...props} onDuplicate={onDuplicate} />
      );
      expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
      expect(getByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).toHaveTextContent('Save');
      expect(getByTestId(DUPLICATE_BUTTON_TEST_ID)).toBeInTheDocument();

      fireEvent.click(getByTestId(DUPLICATE_BUTTON_TEST_ID));
      expect(onDuplicate).toHaveBeenCalled();
    });
  });

  describe('Editing a managed dataview', () => {
    describe('ad hoc dataview', () => {
      it('does not render any button', () => {
        const { queryByTestId } = render(<Footer {...props} isPersisted={false} isManaged />);
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(DUPLICATE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      });

      it('renders duplicate button when onDuplicate is provided', () => {
        const { getByTestId, queryByTestId } = render(
          <Footer {...props} isPersisted={false} isManaged onDuplicate={jest.fn()} />
        );
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(getByTestId(DUPLICATE_BUTTON_TEST_ID)).toBeInTheDocument();
      });
    });

    describe('persisted dataview', () => {
      it('does not render any button', () => {
        const { queryByTestId } = render(<Footer {...props} isPersisted isManaged />);
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(DUPLICATE_BUTTON_TEST_ID)).not.toBeInTheDocument();
      });

      it('renders duplicate button when onDuplicate is provided', () => {
        const { getByTestId, queryByTestId } = render(
          <Footer {...props} isPersisted isManaged onDuplicate={jest.fn()} />
        );
        expect(queryByTestId(SAVE_AS_AD_HOC_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(queryByTestId(SAVE_AS_PERSISTED_BUTTON_TEST_ID)).not.toBeInTheDocument();
        expect(getByTestId(DUPLICATE_BUTTON_TEST_ID)).toBeInTheDocument();
      });
    });
  });
});
