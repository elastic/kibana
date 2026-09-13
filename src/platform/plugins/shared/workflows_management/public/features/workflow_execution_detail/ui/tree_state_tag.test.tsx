/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { TreeStateTag } from './tree_state_tag';

const renderTag = (
  kind: 'failed' | 'latest' | 'running' | 'final' | 'recovered' | 'waitingForInput'
) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TreeStateTag kind={kind} />
      </I18nProvider>
    </EuiProvider>
  );

describe('TreeStateTag', () => {
  it.each(['latest', 'running', 'final', 'recovered'] as const)(
    'renders %s as a plain muted annotation with a middot prefix',
    (kind) => {
      renderTag(kind);
      const el = screen.getByTestId(`workflowStepTreeStateTag-${kind}`);
      expect(el.textContent).toMatch(new RegExp(`·\\s*${kind}`));
    }
  );

  it('renders waitingForInput as a plain muted annotation with a middot prefix', () => {
    renderTag('waitingForInput');
    const el = screen.getByTestId('workflowStepTreeStateTag-waitingForInput');
    expect(el.textContent).toMatch(/·\s*waiting for input/);
  });

  it('renders failed as a danger chip without a middot prefix', () => {
    renderTag('failed');
    const el = screen.getByTestId('workflowStepTreeStateTag-failed');
    expect(el).toHaveTextContent('failed');
    expect(el.textContent).not.toMatch(/·/);
  });
});
