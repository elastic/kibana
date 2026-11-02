/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { InspectorSnapshot } from './snapshot';

interface SnapshotControlsProps {
  onExport: (gzip: boolean) => Promise<void>;
  onImport: (file: File) => void;
}

/** Export/Import buttons shown in the Inspector header. */
export const SnapshotControls = ({ onExport, onImport }: SnapshotControlsProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [gzip, setGzip] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportSnapshot = async () => {
    setIsExporting(true);
    try {
      await onExport(gzip);
      setIsExportOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label="Export Inspector snapshot"
          isOpen={isExportOpen}
          closePopover={() => setIsExportOpen(false)}
          panelStyle={{ maxWidth: 360 }}
          button={
            <EuiButtonEmpty
              size="s"
              iconType="download"
              onClick={() => setIsExportOpen((open) => !open)}
              data-test-subj="inspectorSnapshotExportButton"
            >
              Export
            </EuiButtonEmpty>
          }
        >
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title="The snapshot may contain sensitive data"
          >
            It includes request bodies, raw responses (documents and aggregations) and the app
            state. Share it only with people who may see this data.
          </EuiCallOut>
          <EuiSpacer size="s" />
          <EuiSwitch
            compressed
            label="Compress (gzip)"
            checked={gzip}
            onChange={(e) => setGzip(e.target.checked)}
          />
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            fill
            fullWidth
            isLoading={isExporting}
            onClick={exportSnapshot}
            data-test-subj="inspectorSnapshotDownloadButton"
          >
            Download snapshot
          </EuiButton>
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="upload"
          onClick={() => fileInputRef.current?.click()}
          data-test-subj="inspectorSnapshotImportButton"
        >
          Import
        </EuiButtonEmpty>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.gz,application/json,application/gzip"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              onImport(file);
            }
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface SnapshotCalloutProps {
  snapshot: InspectorSnapshot;
  canRestore: boolean;
  onRestore: () => Promise<void>;
  onClose: () => void;
}

/** Read-only banner shown above the Requests view of an imported snapshot. */
export const SnapshotCallout = ({
  snapshot,
  canRestore,
  onRestore,
  onClose,
}: SnapshotCalloutProps) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const { createdAt, kibanaVersion, timezone, title } = snapshot.meta;

  return (
    <>
      <EuiCallOut
        size="s"
        iconType="upload"
        title={`Snapshot from ${new Date(createdAt).toLocaleString()}, Kibana ${kibanaVersion}`}
        data-test-subj="inspectorSnapshotCallout"
      >
        <p>
          {title ? `${title} · ` : ''}
          {timezone ? `Time zone ${timezone} · ` : ''}
          Read-only view of the imported requests.
        </p>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {canRestore && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isRestoring}
                onClick={async () => {
                  setIsRestoring(true);
                  try {
                    await onRestore();
                  } finally {
                    setIsRestoring(false);
                  }
                }}
                data-test-subj="inspectorSnapshotRestoreButton"
              >
                Restore in app
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onClose} data-test-subj="inspectorSnapshotClose">
              Back to live requests
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
