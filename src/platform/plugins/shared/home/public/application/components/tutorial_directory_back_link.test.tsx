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
import { I18nProvider } from '@kbn/i18n-react';
import { TutorialDirectoryBackLink } from './tutorial_directory_back_link';

const addBasePath = (path: string) => path;
const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;

describe('TutorialDirectoryBackLink', () => {
  it('renders Back to selection when return params are present', () => {
    render(
      <I18nProvider>
        <TutorialDirectoryBackLink
          hash="#/tutorial_directory/fileDataViz?returnAppId=observabilityOnboarding&returnPath=%3F"
          addBasePath={addBasePath}
          getUrlForApp={getUrlForApp}
        />
      </I18nProvider>
    );
    const link = screen.getByRole('link', { name: 'Back to selection' });
    expect(link).toHaveAttribute('href', '/app/observabilityOnboarding?');
  });

  it('renders nothing when the hash has no return params', () => {
    const { container } = render(
      <I18nProvider>
        <TutorialDirectoryBackLink
          hash="#/tutorial_directory/fileDataViz"
          addBasePath={addBasePath}
          getUrlForApp={getUrlForApp}
        />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
