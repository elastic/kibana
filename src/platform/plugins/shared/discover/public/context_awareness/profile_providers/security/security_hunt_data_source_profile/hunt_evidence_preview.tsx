/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import * as i18n from './translations';

interface EvidenceRow {
  id: string;
  index: string;
}

interface HuntEvidencePreviewProps {
  title: string;
  selectedDocs: DataTableRecord[];
  onClose: () => void;
}

/** Lists the selected rows an analyst is about to preserve. Nothing is stored from here. */
export const HuntEvidencePreview: React.FC<HuntEvidencePreviewProps> = ({
  title,
  selectedDocs,
  onClose,
}) => (
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
        items={selectedDocs.map(({ id, raw }) => ({ id, index: raw._index ?? '' }))}
        rowHeader="id"
        tableCaption={i18n.EVIDENCE_PREVIEW_TITLE}
        columns={[
          { field: 'id', name: i18n.EVIDENCE_ID_COLUMN, truncateText: true },
          { field: 'index', name: i18n.EVIDENCE_INDEX_COLUMN, truncateText: true },
        ]}
      />
    </EuiModalBody>
    <EuiModalFooter>
      <EuiButton onClick={onClose} fill>
        {i18n.EVIDENCE_PREVIEW_CLOSE}
      </EuiButton>
    </EuiModalFooter>
  </EuiModal>
);
