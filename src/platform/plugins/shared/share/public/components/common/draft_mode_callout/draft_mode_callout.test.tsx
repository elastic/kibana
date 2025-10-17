/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { DraftModeCallout } from './draft_mode_callout';

describe('DraftModeCallout', () => {
  describe('Default case', () => {
    it('renders a default callout when custom props are not present', () => {
      render(
        <I18nProvider>
          <DraftModeCallout />
        </I18nProvider>
      );
      const callout = screen.getByTestId('unsavedChangesDraftModeCallOut');
      expect(callout).toMatchSnapshot();
    });
  });

  describe('Custom content case', () => {
    it('renders a callout with custom content when custom props are present', () => {
      render(
        <I18nProvider>
          <DraftModeCallout message={'Custom message'} data-test-subj="customDraftModeCallOut" />
        </I18nProvider>
      );
      const callout = screen.getByTestId('customDraftModeCallOut');
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(callout).toMatchSnapshot();
    });
  });

  describe('Node override case', () => {
    it('renders a component override when a node prop is provided', () => {
      render(
        <I18nProvider>
          <DraftModeCallout
            node={<p data-test-subj="overriddenDraftModeCallOut">Component override</p>}
          />
        </I18nProvider>
      );
      const callout = screen.getByTestId('overriddenDraftModeCallOut');
      expect(screen.getByText('Component override')).toBeInTheDocument();
      expect(callout).toMatchSnapshot();
    });
  });
});
