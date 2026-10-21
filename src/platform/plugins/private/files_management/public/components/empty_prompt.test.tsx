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
import { EmptyPrompt } from './empty_prompt';
import { i18nTexts } from '../i18n_texts';

// The "no files" branch is asserted here rather than in a Scout test: files are
// not space-scoped, so a shared server can never guarantee the cluster-wide
// absence the empty prompt represents. Selecting this prompt when the list is
// empty is `TableListView`'s (shared component) responsibility; this test only
// covers what this plugin owns — the prompt's content.
describe('EmptyPrompt', () => {
  it('renders the no-files title and description', () => {
    render(<EmptyPrompt />);

    expect(screen.getByText(i18nTexts.emptyPromptTitle)).toBeInTheDocument();
    expect(screen.getByText(i18nTexts.emptyPromptDescription)).toBeInTheDocument();
  });
});
