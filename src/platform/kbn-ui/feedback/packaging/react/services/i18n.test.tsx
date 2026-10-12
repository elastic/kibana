/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedMessage, translate } from './i18n';

describe('standalone i18n stub', () => {
  it('interpolates brace placeholders', () => {
    expect(
      translate('example', {
        defaultMessage: 'Hello {name}',
        values: { name: 'Elastic' },
      })
    ).toBe('Hello Elastic');
  });

  it('renders rich-text tags with their value functions', () => {
    render(
      <FormattedMessage
        id="kbnUI.feedback.disclaimer.supportInfo"
        defaultMessage="If you need assistance, submit a <supportLink>support request</supportLink> instead."
        values={{
          supportLink: (chunks: React.ReactNode[]) => (
            <a href="https://support.elastic.co">{chunks}</a>
          ),
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'support request' })).toHaveAttribute(
      'href',
      'https://support.elastic.co'
    );
    expect(screen.queryByText(/<supportLink>/)).not.toBeInTheDocument();
    expect(screen.getByText(/If you need assistance, submit a/)).toBeInTheDocument();
    expect(screen.getByText(/instead\./)).toBeInTheDocument();
  });

  it('renders each rich-text tag from the leftmost opening tag', () => {
    render(
      <FormattedMessage
        id="example.links"
        defaultMessage="Submit a <supportLink>support request</supportLink> or read the <privacyStatement>Privacy Statement</privacyStatement>."
        values={{
          privacyStatement: (chunks: React.ReactNode[]) => (
            <a href="https://www.elastic.co/legal/privacy-statement">{chunks}</a>
          ),
          supportLink: (chunks: React.ReactNode[]) => (
            <a href="https://support.elastic.co">{chunks}</a>
          ),
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'support request' })).toHaveAttribute(
      'href',
      'https://support.elastic.co'
    );
    expect(screen.getByRole('link', { name: 'Privacy Statement' })).toHaveAttribute(
      'href',
      'https://www.elastic.co/legal/privacy-statement'
    );
    expect(screen.queryByText(/<supportLink>/)).not.toBeInTheDocument();
    expect(screen.queryByText(/<privacyStatement>/)).not.toBeInTheDocument();
  });

  it('interpolates placeholders around a rich-text tag', () => {
    render(
      <FormattedMessage
        id="example.mixed"
        defaultMessage="Hello {name}, submit a <supportLink>support request</supportLink>."
        values={{
          name: 'Elastic',
          supportLink: (chunks: React.ReactNode[]) => (
            <a href="https://support.elastic.co">{chunks}</a>
          ),
        }}
      />
    );

    expect(screen.getByText(/Hello Elastic, submit a/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support request' })).toHaveAttribute(
      'href',
      'https://support.elastic.co'
    );
  });
});
