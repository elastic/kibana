/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { DOC_TABLE_LEGACY } from '@kbn/discover-utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const CALLOUT_STATE_KEY = 'discover:docExplorerCalloutClosed';

const getStoredCalloutState = (storage: Storage): boolean => {
  const calloutClosed = storage.get(CALLOUT_STATE_KEY);
  return Boolean(calloutClosed);
};
const updateStoredCalloutState = (newState: boolean, storage: Storage) => {
  storage.set(CALLOUT_STATE_KEY, newState);
};

/**
 * The callout that's displayed when Document explorer is disabled
 */
export const DocumentExplorerCallout = () => {
  const { euiTheme } = useEuiTheme();
  const { storage, capabilities, docLinks, addBasePath } = useDiscoverServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));

  const onCloseCallout = useCallback(() => {
    updateStoredCalloutState(true, storage);
    setCalloutClosed(true);
  }, [storage]);

  const semiBoldStyle = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    [euiTheme.font.weight.semiBold]
  );

  if (calloutClosed || !capabilities.advancedSettings.save) {
    return null;
  }

  return (
    <EuiCallOut
      data-test-subj="dscDocumentExplorerLegacyCallout"
      className="dscDocumentExplorerCallout"
      title={<CalloutTitle onCloseCallout={onCloseCallout} />}
      iconType="search"
    >
      <p>
        <FormattedMessage
          id="discover.docExplorerCallout.bodyMessage"
          defaultMessage="Quickly sort, select, and compare data, resize columns, and view documents in fullscreen with the {documentExplorer}."
          values={{
            documentExplorer: (
              <span css={semiBoldStyle}>
                <FormattedMessage
                  id="discover.docExplorerCallout.documentExplorer"
                  defaultMessage="Document Explorer"
                />
              </span>
            ),
          }}
        />
      </p>
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="tryDocumentExplorerButton"
            iconType="tableDensityNormal"
            size="s"
            href={addBasePath(`/app/management/kibana/settings?query=${DOC_TABLE_LEGACY}`)}
          >
            <FormattedMessage
              id="discover.docExplorerCallout.tryDocumentExplorer"
              defaultMessage="Try Document Explorer"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={docLinks.links.discover.documentExplorer} target="_blank">
            <FormattedMessage
              id="discover.docExplorerCallout.learnMore"
              defaultMessage="Learn more"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

function CalloutTitle({ onCloseCallout }: { onCloseCallout: () => void }) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="discover.docExplorerCallout.headerMessage"
          defaultMessage="A better way to explore"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('discover.docExplorerCallout.closeButtonAriaLabel', {
            defaultMessage: 'Close',
          })}
          data-test-subj="dscExplorerCalloutClose"
          onClick={onCloseCallout}
          type="button"
          iconType="cross"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
