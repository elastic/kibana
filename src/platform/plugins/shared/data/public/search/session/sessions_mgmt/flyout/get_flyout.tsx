/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient } from '../../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { Flyout } from './flyout';
import type { BackgroundSearchOpenedHandler, UISession } from '../types';
import { FLYOUT_WIDTH } from './constants';

interface InspectFlyoutProps {
  searchSession: UISession;
}

const InspectFlyout: React.FC<InspectFlyoutProps> = ({ searchSession }) => {
  const renderInfo = () => {
    return (
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
    );
  };

  return (
    <EuiFlyoutBody css={styles.flyout} data-test-subj="searchSessionsFlyout">
      <EuiText>
        <EuiText size="xs">
          <p>
            <FormattedMessage
              id="data.sessions.management.backgroundSearchFlyoutText"
              defaultMessage="Configuration for this background search"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {renderInfo()}
      </EuiText>
    </EuiFlyoutBody>
  );
};

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

export function openSearchSessionsFlyout({
  coreStart,
  kibanaVersion,
  usageCollector,
  config,
  sessionsClient,
  share,
}: {
  coreStart: CoreStart;
  kibanaVersion: string;
  usageCollector: SearchUsageCollector;
  config: SearchSessionsConfigSchema;
  sessionsClient: ISessionsClient;
  share: SharePluginStart;
}) {
  return (
    attrs: { appId?: string; onBackgroundSearchOpened?: BackgroundSearchOpenedHandler } = {}
  ) => {
    const api = new SearchSessionsMgmtAPI(sessionsClient, config, {
      notifications: coreStart.notifications,
      application: coreStart.application,
      usageCollector,
      featureFlags: coreStart.featureFlags,
    });
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext(coreStart);

    const FlyoutContent = () => {
      const [inspectSession, setInspectSession] = useState<UISession | null>(null);

      const handleOpenChildFlyout = useCallback((session: UISession) => {
        setInspectSession(session);
      }, []);

      const handleCloseInspect = useCallback(() => {
        setInspectSession(null);
      }, []);

      return (
        <KibanaReactContextProvider>
          <Flyout
            onClose={() => flyout.close()}
            onBackgroundSearchOpened={(params) => {
              attrs.onBackgroundSearchOpened?.(params);
              flyout.close();
            }}
            onOpenChildFlyout={handleOpenChildFlyout}
            appId={attrs.appId}
            api={api}
            coreStart={coreStart}
            usageCollector={usageCollector}
            config={config}
            kibanaVersion={kibanaVersion}
            locators={share.url.locators}
          />
          {inspectSession && (
            <EuiFlyout
              aria-labelledby="inspectFlyoutTitle"
              size="m"
              onClose={handleCloseInspect}
              flyoutMenuProps={{
                title: 'Inspect background search',
                titleId: 'inspectFlyoutTitle',
              }}
            >
              <InspectFlyout searchSession={inspectSession} />
              <EuiFlyoutFooter>
                <EuiButtonEmpty onClick={handleCloseInspect} aria-label="Close inspect flyout">
                  <FormattedMessage id="data.session_mgmt.close_flyout" defaultMessage="Close" />
                </EuiButtonEmpty>
              </EuiFlyoutFooter>
            </EuiFlyout>
          )}
        </KibanaReactContextProvider>
      );
    };

    const flyout = coreStart.overlays.openSystemFlyout(<FlyoutContent />, {
      title: 'Background searches',
      size: FLYOUT_WIDTH,
      type: 'overlay',
      ownFocus: false,
      onClose: () => {
        // Background searches flyout closed
      },
    });

    return { flyout };
  };
}
