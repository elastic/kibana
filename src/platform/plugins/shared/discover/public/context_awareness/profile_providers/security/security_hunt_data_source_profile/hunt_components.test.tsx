/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataTableRecord } from '@kbn/discover-utils';
import { HuntEvidencePreview } from './hunt_evidence_preview';
import { HuntGuidanceFlyout } from './hunt_guidance_flyout';

describe('HuntGuidanceFlyout', () => {
  const definition = {
    id: 'rare_lsass_process_access',
    version: 1,
    name: 'Rare LSASS access',
    hypothesis: 'Credential dumping',
    resultKind: 'raw_event' as const,
    references: ['https://example.com/ref'],
    guidance: {
      analystNotes: ['Check the parent process'],
      expectedFalsePositives: ['Backup agents'],
      suggestedPivots: [],
    },
  };

  it('shows the hypothesis and each guidance section that has content', () => {
    renderWithI18n(<HuntGuidanceFlyout definition={definition} onClose={jest.fn()} />);

    expect(screen.getByText('Rare LSASS access')).toBeInTheDocument();
    expect(screen.getByTestId('discoverHuntHypothesis')).toHaveTextContent('Credential dumping');
    expect(screen.getByTestId('discoverHuntAnalystNotes')).toBeInTheDocument();
    expect(screen.getByText('Backup agents')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/ref')).toBeInTheDocument();
  });

  it('omits empty sections', () => {
    renderWithI18n(<HuntGuidanceFlyout definition={definition} onClose={jest.fn()} />);

    expect(screen.queryByTestId('discoverHuntPivots')).not.toBeInTheDocument();
  });
});

describe('HuntEvidencePreview', () => {
  const docs = [
    { id: 'a', raw: { _index: 'logs-1' }, flattened: {} },
    { id: 'b', raw: { _index: 'logs-2' }, flattened: {} },
  ] as DataTableRecord[];

  it('lists the selected rows with their index', () => {
    renderWithI18n(
      <HuntEvidencePreview
        title="Preserve as Investigation"
        selectedDocs={docs}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('discoverHuntEvidenceSummary')).toHaveTextContent('2 rows selected.');
    expect(screen.getByText('logs-1')).toBeInTheDocument();
    expect(screen.getByText('logs-2')).toBeInTheDocument();
  });

  it('saves only when confirmed and keeps the dialog open to show a failure', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Forbidden document'));
    renderWithI18n(
      <HuntEvidencePreview
        title="Preserve as Investigation"
        selectedDocs={docs}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    );
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('discoverHuntEvidenceConfirm'));

    await waitFor(() =>
      expect(screen.getByTestId('discoverHuntEvidenceError')).toHaveTextContent(
        'Forbidden document'
      )
    );
    expect(screen.getByTestId('discoverHuntEvidenceConfirm')).toBeEnabled();
  });

  it('saves the context note the analyst wrote, trimmed', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <HuntEvidencePreview
        title="Preserve as Investigation"
        selectedDocs={docs}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('discoverHuntEvidenceNote'), {
      target: { value: '  Same rare port on both hosts ' },
    });
    fireEvent.click(screen.getByTestId('discoverHuntEvidenceConfirm'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Same rare port on both hosts'));
  });

  it('closes without saving on cancel', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    renderWithI18n(
      <HuntEvidencePreview
        title="Preserve as Investigation"
        selectedDocs={docs}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
