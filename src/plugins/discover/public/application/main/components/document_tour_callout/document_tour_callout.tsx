/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import './document_tour_callout.scss';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonIcon, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getServices } from '../../../../kibana_services';
import { DOC_TABLE_LEGACY } from '../../../../../common';
import { Storage } from '../../../../../../kibana_utils/public';

const CALLOUT_STATE_KEY = 'discover:docTourCalloutClosed';

const getStoredCalloutState = (storage: Storage): boolean => {
  const calloutClosed = storage.get(CALLOUT_STATE_KEY);
  return Boolean(calloutClosed);
};
const updateStoredCalloutState = (newState: boolean, storage: Storage) => {
  storage.set(CALLOUT_STATE_KEY, newState);
};

export const DocumentTourCallout = ({ onStartTour }: { onStartTour: () => void }) => {
  const { storage, capabilities, addBasePath } = getServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));

  const onCloseCallout = () => {
    updateStoredCalloutState(true, storage);
    setCalloutClosed(true);
  };

  if (calloutClosed && capabilities.advancedSettings.save) {
    return null;
  }

  return (
    <EuiCallOut
      className="dscDocumentTourCallout"
      title={<CalloutTitle onCloseCallout={onCloseCallout} />}
      iconType="tableDensityNormal"
    >
      <p>
        <FormattedMessage
          id="discover.docTourCallout.bodyMessage"
          defaultMessage="View field details, drag and drop columns, and more in the Document Explorer. Ready for the rundown?"
        />
      </p>
      <p>
        <EuiButton size="s" onClick={onStartTour}>
          <FormattedMessage
            id="discover.docTourCallout.tryDocumentTour"
            defaultMessage="Take a tour"
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
          id="discover.docTourCallout.headerMessage"
          defaultMessage="A better way to explore"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('discover.docTourCallout.closeButtonAriaLabel', {
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
