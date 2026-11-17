/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import * as i18n from './translations';

/** Matches the longest note the server stores. */
const HUNT_NOTE_MAX_LENGTH = 2000;

interface EvidenceRow {
  id: string;
  index: string;
}

interface HuntEvidencePreviewProps {
  title: string;
  selectedDocs: DataTableRecord[];
  /** Saves the evidence. Rejects with a readable message; resolves once it is durable. */
  onConfirm: (note: string) => Promise<void>;
  onClose: () => void;
}

/** Lists the selected rows and saves them only when the analyst confirms. */
export const HuntEvidencePreview: React.FC<HuntEvidencePreviewProps> = ({
  title,
  selectedDocs,
  onConfirm,
  onClose,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  const confirm = useCallback(async () => {
    setIsSaving(true);
    setError(undefined);
    try {
      await onConfirm(note.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.SAVE_FAILED);
      setIsSaving(false);
    }
  }, [onConfirm, note]);

  return (
    <EuiModal
      onClose={onClose}
      aria-label={i18n.EVIDENCE_PREVIEW_TITLE}
      data-test-subj="discoverHuntEvidencePreview"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p data-test-subj="discoverHuntEvidenceSummary">
            {i18n.EVIDENCE_PREVIEW_SUMMARY(selectedDocs.length)}
          </p>
        </EuiText>
        <EuiBasicTable<EvidenceRow>
          items={selectedDocs.map(({ id, raw, flattened }) => ({
            id: String(flattened._id ?? id),
            index: String(flattened._index ?? raw._index ?? ''),
          }))}
          rowHeader="id"
          tableCaption={i18n.EVIDENCE_PREVIEW_TITLE}
          columns={[
            { field: 'id', name: i18n.EVIDENCE_ID_COLUMN, truncateText: true },
            { field: 'index', name: i18n.EVIDENCE_INDEX_COLUMN, truncateText: true },
          ]}
        />
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.EVIDENCE_NOTE_LABEL} helpText={i18n.EVIDENCE_NOTE_HELP} fullWidth>
          <EuiTextArea
            fullWidth
            rows={3}
            maxLength={HUNT_NOTE_MAX_LENGTH}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isSaving}
            placeholder={i18n.EVIDENCE_NOTE_PLACEHOLDER}
            data-test-subj="discoverHuntEvidenceNote"
          />
        </EuiFormRow>
        {error && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={error}
              data-test-subj="discoverHuntEvidenceError"
            />
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
          {i18n.EVIDENCE_PREVIEW_CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={confirm}
          isLoading={isSaving}
          data-test-subj="discoverHuntEvidenceConfirm"
        >
          {title}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
