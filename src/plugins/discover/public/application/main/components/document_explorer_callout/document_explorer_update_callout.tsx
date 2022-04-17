/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import './document_explorer_callout.scss';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useDiscoverServices } from '../../../../utils/use_discover_services';

export const CALLOUT_STATE_KEY = 'discover:docExplorerUpdateCalloutClosed';

const getStoredCalloutState = (storage: Storage): boolean => {
  const calloutClosed = storage.get(CALLOUT_STATE_KEY);
  return Boolean(calloutClosed);
};
const updateStoredCalloutState = (newState: boolean, storage: Storage) => {
  storage.set(CALLOUT_STATE_KEY, newState);
};

/**
 * The callout that's displayed when Document explorer is enabled
 */
export const DocumentExplorerUpdateCallout = () => {
  const { euiTheme } = useEuiTheme();
  const { storage, capabilities, docLinks } = useDiscoverServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));

  const semiBoldStyle = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    [euiTheme.font.weight.semiBold]
  );

  const onCloseCallout = useCallback(() => {
    updateStoredCalloutState(true, storage);
    setCalloutClosed(true);
  }, [storage]);

  if (calloutClosed || !capabilities.advancedSettings.save) {
    return null;
  }

  return (
    <EuiCallOut
      className="dscDocumentExplorerCallout"
      title={<CalloutTitle onCloseCallout={onCloseCallout} />}
      iconType="search"
    >
      <p>
        <FormattedMessage
          id="discover.docExplorerUpdateCallout.bodyMessage"
          defaultMessage="Perform multi-column sorting, resize columns, set row height, and view data in fullscreen with the {documentExplorer}.
          Learn more about the structure of your data with {fieldStatistics}."
          values={{
            fieldStatistics: (
              <EuiLink href={docLinks.links.discover.fieldStatistics}>
                <span css={semiBoldStyle}>
                  <FormattedMessage
                    id="discover.docExplorerUpdateCallout.fieldStatistics"
                    defaultMessage="field statistics"
                  />
                </span>
              </EuiLink>
            ),
            documentExplorer: (
              <EuiLink href={docLinks.links.discover.documentExplorer}>
                <span css={semiBoldStyle}>
                  <FormattedMessage
                    id="discover.docExplorerUpdateCallout.documentExplorer"
                    defaultMessage="new document table"
                  />
                </span>
              </EuiLink>
            ),
          }}
        />
      </p>
      <EuiButton
        data-test-subj="document-explorer-update-callout-dismiss-button"
        iconType="tableDensityNormal"
        size="s"
        onClick={onCloseCallout}
      >
        <FormattedMessage
          id="discover.docExplorerUpdateCallout.dismissButtonLabel"
          defaultMessage="Dismiss"
        />
      </EuiButton>
    </EuiCallOut>
  );
};

function CalloutTitle({ onCloseCallout }: { onCloseCallout: () => void }) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="discover.docExplorerUpdateCallout.headerMessage"
          defaultMessage="Exploring your data just got better"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('discover.docExplorerUpdateCallout.closeButtonAriaLabel', {
            defaultMessage: 'Close',
          })}
          onClick={onCloseCallout}
          type="button"
          iconType="cross"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
