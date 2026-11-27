/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ActionButtons } from './action_buttons';
import { createGithubSourceLinks } from '../../../../host/create_github_source_links';

const propsMock = {
  links: createGithubSourceLinks({ repo: 'elastic/kibana', branch: 'main' })({
    fileName: '/Users/test/kibana/src/components/example/component.tsx',
    lineNumber: 42,
    columnNumber: 15,
    relativePath: 'src/components/example/component.tsx',
  }),
};

describe('ActionButtons', () => {
  it('should render correctly', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const container = screen.getByTestId('inspectComponentActionButtons');

    expect(container).toBeInTheDocument();
  });

  it('should render nothing when the host provides no links', () => {
    renderWithI18n(<ActionButtons links={[]} />);

    expect(screen.queryByTestId('inspectComponentActionButtons')).not.toBeInTheDocument();
  });

  it('should render custom host links', () => {
    renderWithI18n(
      <ActionButtons
        links={[{ id: 'custom', label: 'Custom', href: 'https://example.com', iconType: 'link' }]}
      />
    );

    const card = screen.getByTestId('inspectComponentActionButton-custom');

    expect(within(card).getByRole('link', { name: /custom/i })).toHaveAttribute(
      'href',
      'https://example.com'
    );
  });

  it('should generate correct GitHub link', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const githubButtonCard = screen.getByTestId('inspectComponentActionButton-github');

    expect(githubButtonCard).toBeInTheDocument();

    const githubLink = within(githubButtonCard).getByRole('link', { name: /github/i });

    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/elastic/kibana/blob/main/src/components/example/component.tsx#L42'
    );
  });

  it('should generate correct GitHub.dev link', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const githubDevButtonCard = screen.getByTestId('inspectComponentActionButton-githubDev');

    expect(githubDevButtonCard).toBeInTheDocument();

    const githubDevLink = within(githubDevButtonCard).getByRole('link', { name: /github\.dev/i });

    expect(githubDevLink).toHaveAttribute(
      'href',
      'https://github.dev/elastic/kibana/blob/main/src/components/example/component.tsx#L42'
    );
  });

  it('should generate correct VSCode link', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const vscodeButtonCard = screen.getByTestId('inspectComponentActionButton-vscode');

    expect(vscodeButtonCard).toBeInTheDocument();

    const vscodeLink = within(vscodeButtonCard).getByRole('link', { name: /vscode/i });

    expect(vscodeLink).toHaveAttribute(
      'href',
      'vscode://file//Users/test/kibana/src/components/example/component.tsx:42:15'
    );
  });

  it('should generate correct WebStorm link', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const webstormButtonCard = screen.getByTestId('inspectComponentActionButton-webstorm');

    expect(webstormButtonCard).toBeInTheDocument();

    const webstormLink = within(webstormButtonCard).getByRole('link', { name: /webstorm/i });

    expect(webstormLink).toHaveAttribute(
      'href',
      'webstorm://open?file=//Users/test/kibana/src/components/example/component.tsx&line=42&column=15'
    );
  });

  it('should generate correct Cursor link', () => {
    renderWithI18n(<ActionButtons {...propsMock} />);

    const cursorButtonCard = screen.getByTestId('inspectComponentActionButton-cursor');

    expect(cursorButtonCard).toBeInTheDocument();

    const cursorLink = within(cursorButtonCard).getByRole('link', { name: /cursor/i });

    expect(cursorLink).toHaveAttribute(
      'href',
      'cursor://file//Users/test/kibana/src/components/example/component.tsx:42:15'
    );
  });
});
