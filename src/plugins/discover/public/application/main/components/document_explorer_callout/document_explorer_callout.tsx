/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import './document_explorer_callout.scss';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonIcon, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { DOC_TABLE_LEGACY } from '../../../../../common';
import { Storage } from '../../../../../../kibana_utils/public';

export const CALLOUT_STATE_KEY = 'discover:docExplorerCalloutClosed';

const getStoredCalloutState = (storage: Storage): boolean => {
  const calloutClosed = storage.get(CALLOUT_STATE_KEY);
  return Boolean(calloutClosed);
};
const updateStoredCalloutState = (newState: boolean, storage: Storage) => {
  storage.set(CALLOUT_STATE_KEY, newState);
};

export const DocumentExplorerCallout = () => {
  const { storage, capabilities, addBasePath } = useDiscoverServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));

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
          id="discover.docExplorerCallout.bodyMessage"
          defaultMessage="Quickly sort, select, and compare data, resize columns, and view documents in fullscreen with the Document Explorer."
        />
      </p>
      <p>
        <EuiButton
          iconType="tableDensityNormal"
          size="s"
          href={addBasePath(`/app/management/kibana/settings?query=${DOC_TABLE_LEGACY}`)}
        >
          <FormattedMessage
            id="discover.docExplorerCallout.tryDocumentExplorer"
            defaultMessage="Try Document Explorer"
          />
        </EuiButton>
      </p>
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
          onClick={onCloseCallout}
          type="button"
          iconType="cross"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
