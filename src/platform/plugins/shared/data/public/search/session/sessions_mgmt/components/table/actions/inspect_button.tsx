/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Fragment } from 'react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CodeEditor } from '@kbn/code-editor';
import type { UISession } from '../../../types';
import type { IClickActionDescriptor } from './types';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import { BACKGROUND_SEARCH_FEATURE_FLAG_KEY } from '../../../../constants';

interface InspectFlyoutProps {
  searchSession: UISession;
  hasBackgroundSearchEnabled: boolean;
}

const InspectFlyout: React.FC<InspectFlyoutProps> = ({
  searchSession,
  hasBackgroundSearchEnabled,
}) => {
  const renderInfo = () => {
    return (
      <Fragment>
        <CodeEditor
          languageId="json"
          value={JSON.stringify(searchSession, null, 2)}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </Fragment>
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {hasBackgroundSearchEnabled ? (
              <FormattedMessage
                id="data.sessions.management.backgroundSearchFlyoutTitle"
                defaultMessage="Inspect background search"
              />
            ) : (
              <FormattedMessage
                id="data.sessions.management.flyoutTitle"
                defaultMessage="Inspect search session"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={styles.flyout} data-test-subj="searchSessionsFlyout">
        <EuiText>
          <EuiText size="xs">
            <p>
              {hasBackgroundSearchEnabled ? (
                <FormattedMessage
                  id="data.sessions.management.backgroundSearchFlyoutText"
                  defaultMessage="Configuration for this background search"
                />
              ) : (
                <FormattedMessage
                  id="data.sessions.management.flyoutText"
                  defaultMessage="Configuration for this search session"
                />
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          {renderInfo()}
        </EuiText>
      </EuiFlyoutBody>
    </>
  );
};

interface InspectFlyoutWrapperProps {
  searchSession: UISession;
  uiSettings: CoreStart['uiSettings'];
  settings: CoreStart['settings'];
  theme: CoreStart['theme'];
  hasBackgroundSearchEnabled: boolean;
}

const InspectFlyoutWrapper: React.FC<InspectFlyoutWrapperProps> = ({
  searchSession,
  uiSettings,
  settings,
  theme,
  hasBackgroundSearchEnabled,
}) => {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
    settings,
    theme,
  });

  return (
    <KibanaReactContextProvider>
      <InspectFlyout
        searchSession={searchSession}
        hasBackgroundSearchEnabled={hasBackgroundSearchEnabled}
      />
    </KibanaReactContextProvider>
  );
};

export const createInspectActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: 'document',
  label: (
    <FormattedMessage
      id="data.mgmt.searchSessions.flyoutTitle"
      aria-label="Inspect"
      defaultMessage="Inspect"
    />
  ),
  onClick: async () => {
    const flyoutWrapper = (
      <InspectFlyoutWrapper
        hasBackgroundSearchEnabled={core.featureFlags.getBooleanValue(
          BACKGROUND_SEARCH_FEATURE_FLAG_KEY,
          false
        )}
        uiSettings={core.uiSettings}
        settings={core.settings}
        theme={core.theme}
        searchSession={uiSession}
      />
    );
    const overlay = core.overlays.openFlyout(toMountPoint(flyoutWrapper, core));
    await overlay.onClose;
  },
});

const styles = {
  flyout: css({
    '.euiFlyoutBody__overflowContent': {
      height: '100%',
      '> div': {
        height: '100%',
      },
    },
  }),
};
