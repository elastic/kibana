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
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDiscoverTourContext } from '../../../../components/discover_tour';

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
  const { storage, capabilities } = useDiscoverServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));
  const { onStartTour } = useDiscoverTourContext();

  const onCloseCallout = useCallback(() => {
    updateStoredCalloutState(true, storage);
    setCalloutClosed(true);
  }, [storage]);

  if (calloutClosed || !capabilities.advancedSettings.save) {
    return null;
  }

  return (
    <EuiCallOut
      data-test-subj="dscDocumentExplorerTourCallout"
      className="dscDocumentExplorerCallout"
      title={<CalloutTitle onCloseCallout={onCloseCallout} />}
      iconType="tableDensityNormal"
      heading="h3"
      size="s"
    >
      <p>
        <FormattedMessage
          id="discover.docExplorerUpdateCallout.description"
          defaultMessage="Add relevant fields, reorder and sort columns, resize rows, and more in the document table."
        />
      </p>
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onStartTour} data-test-subj="discoverTakeTourButton">
            <FormattedMessage
              id="discover.docExplorerUpdateCallout.takeTourButtonLabel"
              defaultMessage="Take the tour"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            onClick={onCloseCallout}
            data-test-subj="document-explorer-update-callout-dismiss-button"
          >
            <FormattedMessage
              id="discover.docExplorerUpdateCallout.dismissButtonLabel"
              defaultMessage="Dismiss"
            />
          </EuiButtonEmpty>
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
          id="discover.docExplorerUpdateCallout.title"
          defaultMessage="Get the best look at your search results"
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
