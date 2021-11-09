/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { useKibana } from '../../../kibana_react/public';
import { DiscoverServices } from '../build_services';

export const DiscoverAlertButton = ({ index, timeField }: { index: string; timeField: string }) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);
  const { triggersActionsUi } = useKibana<DiscoverServices>().services;

  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi?.getAddAlertFlyout({
        consumer: 'discover',
        onClose: onCloseAlertFlyout,
        canChangeTrigger: false,
        alertTypeId: '.discover-threshold',
        metadata: {
          isInternal: true,
        },
        initialValues: {
          params: { index, timeField },
        },
      }),
    [onCloseAlertFlyout, triggersActionsUi, index, timeField]
  );

  // in render section of component
  return (
    <>
      {alertFlyoutVisible && AddAlertFlyout}
      <EuiButton
        fill
        iconType="plusInCircle"
        iconSide="left"
        onClick={() => setAlertFlyoutVisibility(true)}
      >
        <FormattedMessage id="emptyButton" defaultMessage="Create alert" />
      </EuiButton>
    </>
  );
};
