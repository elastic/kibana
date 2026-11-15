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
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiDescriptionList,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { InspectorSnapshot, InspectorSnapshotMeta } from './snapshot';
import { getEnvironmentDetails, getSnapshotTitle } from './environment';

interface SnapshotPanelProps {
  onExport: (gzip: boolean) => Promise<void>;
  onImport: (file: File) => void;
  /** An imported snapshot is open; export still uses the live requests */
  hasImportedSnapshot?: boolean;
  /** The app replays an imported snapshot, so the live requests are replayed responses */
  isReplaying?: boolean;
}

/** Content of the "Import / Export" Inspector view. */
export const SnapshotPanel = ({
  onExport,
  onImport,
  hasImportedSnapshot,
  isReplaying,
}: SnapshotPanelProps) => {
  const [gzip, setGzip] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportSnapshot = async () => {
    setIsExporting(true);
    try {
      await onExport(gzip);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div data-test-subj="inspectorSnapshotPanel">
      <EuiTitle size="xs">
        <h2>Export</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          Download a snapshot of the requests and app state to share or inspect later. It also
          records the Kibana version and build, space, time zone, locale, browser, operating system
          and screen size to help reproduce issues.
        </p>
        {hasImportedSnapshot && (
          <p data-test-subj="inspectorSnapshotExportLiveNote">
            Exports the requests of the app, not the imported snapshot you are viewing.
          </p>
        )}
        {isReplaying && (
          <p data-test-subj="inspectorSnapshotExportReplayNote">
            The app is replaying a snapshot, so the export contains its replayed responses.
          </p>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        color="warning"
        iconType="warning"
        title="The snapshot may contain sensitive data"
      >
        It includes request bodies, raw responses (documents and aggregations) and the app state.
        Share it only with people who may see this data.
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="download"
            isLoading={isExporting}
            onClick={exportSnapshot}
            data-test-subj="inspectorSnapshotDownloadButton"
          >
            Download snapshot
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label="Compress (gzip)"
            checked={gzip}
            onChange={(e) => setGzip(e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="l" />
      <EuiTitle size="xs">
        <h2>Import</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>Open a previously exported snapshot (.json or .gz) in a read-only Requests view.</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        iconType="upload"
        onClick={() => fileInputRef.current?.click()}
        data-test-subj="inspectorSnapshotImportButton"
      >
        Import snapshot
      </EuiButton>
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
    </div>
  );
};

interface EnvironmentDetailsProps {
  meta: InspectorSnapshotMeta;
  currentMeta?: InspectorSnapshotMeta;
  id: string;
}

/** Collapsible list of a snapshot's environment, highlighting differences to the current session. */
export const EnvironmentDetails = ({ meta, currentMeta, id }: EnvironmentDetailsProps) => {
  const details = getEnvironmentDetails(meta, currentMeta);
  if (!details.length) {
    return null;
  }
  const differences = details.filter((detail) => detail.current !== undefined).length;
  return (
    <>
      <EuiAccordion
        id={id}
        buttonContent={
          <>
            Environment details{' '}
            {differences > 0 && (
              <EuiBadge color="warning">
                {differences} {differences === 1 ? 'difference' : 'differences'}
              </EuiBadge>
            )}
          </>
        }
        paddingSize="s"
        data-test-subj={id}
      >
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 3]}
          listItems={details.map((detail) => ({
            title: detail.label,
            description: (
              <span data-test-subj={`${id}-${detail.id}`}>
                {detail.value}
                {detail.current !== undefined && (
                  <>
                    {' '}
                    <EuiBadge color="warning">Current: {detail.current}</EuiBadge>
                  </>
                )}
              </span>
            ),
          }))}
        />
      </EuiAccordion>
      <EuiSpacer size="s" />
    </>
  );
};

const getExportedWith = ({ browser }: InspectorSnapshotMeta) =>
  browser?.name
    ? `Exported with ${[browser.name, browser.version].filter(Boolean).join(' ')}${
        browser.os ? ` on ${browser.os}` : ''
      } · `
    : '';

interface SnapshotReplayNoticeProps {
  meta: InspectorSnapshotMeta;
  currentMeta?: InspectorSnapshotMeta;
}

/** Shown above the live views while the app replays the responses of an imported snapshot. */
export const SnapshotReplayNotice = ({ meta, currentMeta }: SnapshotReplayNoticeProps) => (
  <>
    <EuiCallOut
      size="s"
      color="warning"
      iconType="upload"
      title={`Restored data: ${getSnapshotTitle(meta, 'Replaying snapshot')}`}
      data-test-subj="inspectorSnapshotReplayNotice"
    >
      <p>
        {getExportedWith(meta)}
        The responses below were replayed from the snapshot, not fetched from Elasticsearch.
        Requests that are not in the snapshot failed or went live.
      </p>
      <EnvironmentDetails
        id="inspectorSnapshotReplayEnvironment"
        meta={meta}
        currentMeta={currentMeta}
      />
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);

interface SnapshotCalloutProps {
  snapshot: InspectorSnapshot;
  /** Meta of the current session, used to highlight environment differences. */
  currentMeta?: InspectorSnapshotMeta;
  canRestore: boolean;
  onRestore: () => Promise<void>;
  onClose: () => void;
}

/** Read-only banner shown above the Requests view of an imported snapshot. */
export const SnapshotCallout = ({
  snapshot,
  currentMeta,
  canRestore,
  onRestore,
  onClose,
}: SnapshotCalloutProps) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const { timezone, title } = snapshot.meta;

  return (
    <>
      <EuiCallOut
        size="s"
        iconType="upload"
        title={getSnapshotTitle(snapshot.meta)}
        data-test-subj="inspectorSnapshotCallout"
      >
        <p>
          {title ? `${title} · ` : ''}
          {timezone ? `Time zone ${timezone} · ` : ''}
          {getExportedWith(snapshot.meta)}
          Read-only view of the imported requests.
        </p>
        <EnvironmentDetails
          id="inspectorSnapshotEnvironment"
          meta={snapshot.meta}
          currentMeta={currentMeta}
        />
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
