/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import './discover_field_types_callout.scss';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiButtonIcon, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { Storage } from '../../../../../../kibana_utils/public';

export const CALLOUT_STATE_KEY = 'discover:fieldTypesCalloutClosed';

const getStoredCalloutState = (storage: Storage): boolean => {
  const calloutClosed = storage.get(CALLOUT_STATE_KEY);
  return Boolean(calloutClosed);
};
const updateStoredCalloutState = (newState: boolean, storage: Storage) => {
  storage.set(CALLOUT_STATE_KEY, newState);
};

export const FieldTypesCallout = ({ togglePopover }) => {
  const { storage } = useDiscoverServices();
  const [calloutClosed, setCalloutClosed] = useState(getStoredCalloutState(storage));

  const onCloseCallout = useCallback(() => {
    updateStoredCalloutState(true, storage);
    setCalloutClosed(true);
  }, [storage]);

  if (calloutClosed) {
    return null;
  }

  return (
    <EuiCallOut className="dscLearnCallout" size="s" title="">
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiButtonEmpty
            aria-label={i18n.translate('discover.fieldTypesPopover', {
              defaultMessage: 'Learn about field types',
            })}
            className="dscLearnBtn"
            size="xs"
            onClick={togglePopover}
          >
            <FormattedMessage
              id="discover.fieldTypesPopover"
              defaultMessage="Learn about field types"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon color="primary" size="xs" iconType="cross" onClick={onCloseCallout} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
