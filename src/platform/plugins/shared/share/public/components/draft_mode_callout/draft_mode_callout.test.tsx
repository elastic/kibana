/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { DraftModeCallout } from './draft_mode_callout';
import { I18nProvider } from '@kbn/i18n-react';

describe('DraftModeCallout', () => {
  describe('Default case', () => {
    it('renders a default callout when custom props are not present', () => {
      render(
        <I18nProvider>
          <DraftModeCallout />
        </I18nProvider>
      );
      const callout = screen.getByTestId('unsavedChangesDraftModeCallOut');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(callout).toMatchSnapshot();
    });
  });

  describe('Custom content case', () => {
    const handleOnClickMock = jest.fn();
    beforeEach(() => {
      render(
        <I18nProvider>
          <DraftModeCallout
            buttonProps={{ onClick: handleOnClickMock, label: 'Save changes' }}
            message={'Custom message'}
            data-test-subj="customDraftModeCallOut"
          />
        </I18nProvider>
      );
    });

    it('renders a callout with custom content when custom props are present', () => {
      const callout = screen.getByTestId('customDraftModeCallOut');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(callout).toMatchSnapshot();
    });

    it('calls on click handler when clicked', async () => {
      const button = screen.getByRole('button', { name: 'Save changes' });
      await userEvent.click(button);
      expect(handleOnClickMock).toHaveBeenCalledTimes(1);
    });
  });
});
