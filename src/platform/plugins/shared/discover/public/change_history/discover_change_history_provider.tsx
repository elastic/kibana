/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ChangeHistoryBadgeRenderFn,
  ChangeHistoryProviderProps,
} from '@kbn/change-history-ui';
import {
  ChangeHistoryModal,
  ChangeHistoryPreview,
  ChangeHistoryProvider,
} from '@kbn/change-history-ui';
import { DISCOVER_SESSION_DELETE_ACTION } from '../../common/constants';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { useInternalStateSelector } from '../application/main/state_management/redux';
import { DiscoverSessionHistoryPreview } from './discover_session_history_preview';
import { createDiscoverChangeHistoryAdapter } from './discover_change_history_adapter';

const SCOPE = {
  module: 'discover',
  dataset: 'discover-sessions',
  objectType: 'discover-session',
};

const renderBadge: ChangeHistoryBadgeRenderFn = ({ item }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
    {item.isCurrent && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('discover.changeHistory.currentVersionBadge', {
            defaultMessage: 'Current version',
          })}
        </EuiBadge>
      </EuiFlexItem>
    )}
    {item.action === DISCOVER_SESSION_DELETE_ACTION && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="danger">
          {i18n.translate('discover.changeHistory.deletedBadge', { defaultMessage: 'Deleted' })}
        </EuiBadge>
      </EuiFlexItem>
    )}
    {typeof item.metadata?.version === 'number' && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('discover.changeHistory.versionBadge', {
            defaultMessage: 'v{version}',
            values: { version: item.metadata.version },
          })}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

// renders the nChanges string as a link that triggers the comparison view
const renderChanges: NonNullable<ChangeHistoryProviderProps['renderChanges']> = ({
  item,
  nChanges,
  requestCompareToPrevious,
}) =>
  item.metadata?.version === 1 || !requestCompareToPrevious ? (
    nChanges // version 1 has nothing to compare to, so don't make it a button
  ) : (
    <EuiButtonEmpty
      data-test-subj="discoverChangeHistoryItemChanges"
      size="xs"
      flush="both"
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation(); // the compare request already selects this row
        requestCompareToPrevious();
      }}
    >
      {nChanges}
    </EuiButtonEmpty>
  );

// shows the session rendered read-only, or the JSON comparison when the user requested one
const renderPreview: ChangeHistoryProviderProps['renderPreview'] = (props) => {
  const { compareSpec, compareMode, diffTelemetry } = props;
  if (compareMode && compareSpec) {
    return (
      <ChangeHistoryPreview
        baseline={compareSpec.baseline.snapshot as object}
        target={compareSpec.target.snapshot as object}
        compareSpec={compareSpec}
        diffTelemetry={diffTelemetry}
        language="json"
      />
    );
  }

  return <DiscoverSessionHistoryPreview {...props} />;
};

export const DiscoverChangeHistoryProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const services = useDiscoverServices();
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const sessionId = persistedDiscoverSession?.id ?? '';
  const canRestore =
    Boolean(services.capabilities.discover_v2.save) && !persistedDiscoverSession?.managed;

  const onRestored = useCallback(() => {
    // the restore happened on the server: reload so the app reads the restored session
    services.locator.navigate({ savedSearchId: sessionId });
    window.location.reload();
  }, [services.locator, sessionId]);

  const adapter = useMemo(
    () => createDiscoverChangeHistoryAdapter({ http: services.http, canRestore, onRestored }),
    [services.http, canRestore, onRestored]
  );

  return (
    <ChangeHistoryProvider
      objectId={sessionId}
      adapter={adapter}
      renderPreview={renderPreview}
      renderBadge={renderBadge}
      renderChanges={renderChanges}
      labels={{
        previewBackLabel: i18n.translate('discover.changeHistory.backToDiscover', {
          defaultMessage: 'Back to Discover',
        }),
        previewTitle: persistedDiscoverSession?.title ?? sessionId,
      }}
      features={{ compare: true, restore: true, unsavedChanges: false }}
      permissions={{ canRestore }}
      scope={SCOPE}
      analytics={services.core.analytics}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
