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
import { ISearchSource } from '../../../data/common';

export const DiscoverQueryAlertButton = ({
  index,
  timeField,
  searchSource,
}: {
  index: string;
  timeField: string;
  searchSource: ISearchSource;
}) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);
  const { triggersActionsUi } = useKibana<DiscoverServices>().services;

  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );
  const getQuery = useCallback(() => {
    const clonedSearchSource = searchSource.createCopy();
    return JSON.stringify(clonedSearchSource.getSearchRequestBody());
  }, [searchSource]);

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi?.getAddAlertFlyout({
        consumer: 'discover',
        onClose: onCloseAlertFlyout,
        canChangeTrigger: false,
        alertTypeId: '.es-query',
        metadata: {
          isInternal: true,
        },
        initialValues: {
          params: { index: [index], timeField, esQuery: getQuery() },
        },
      }),
    [onCloseAlertFlyout, triggersActionsUi, index, timeField, getQuery]
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
        <FormattedMessage id="emptyButton" defaultMessage="Create ES query alert" />
      </EuiButton>
    </>
  );
};
