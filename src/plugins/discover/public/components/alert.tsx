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
import { updateSearchSource } from '../application/main/utils/update_search_source';

export const DiscoverAlertButton = ({
  index,
  timeField,
  searchSource,
}: {
  index: string;
  timeField: string;
  searchSource: ISearchSource;
}) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);
  const { services } = useKibana<DiscoverServices>();

  const { triggersActionsUi } = useKibana<DiscoverServices>().services;

  const onCloseAlertFlyout = useCallback(
    () => setAlertFlyoutVisibility(false),
    [setAlertFlyoutVisibility]
  );

  const getParams = useCallback(() => {
    const nextSearchSource = searchSource.createCopy();
    updateSearchSource(nextSearchSource, true, {
      indexPattern: searchSource.getField('index')!,
      services,
      sort: [],
      useNewFieldsApi: true,
    });
    const serializedSearchSource = nextSearchSource.serialize();

    return {
      index,
      timeField,
      searchSourceJSON: serializedSearchSource.searchSourceJSON,
      searchSourceReferencesJSON: JSON.stringify(serializedSearchSource.references),
    };
  }, [searchSource, index, timeField, services]);

  const AddAlertFlyout = useMemo(
    () =>
      alertFlyoutVisible &&
      triggersActionsUi?.getAddAlertFlyout({
        consumer: 'discover',
        onClose: onCloseAlertFlyout,
        canChangeTrigger: false,
        alertTypeId: '.discover-threshold',
        metadata: {
          isInternal: true,
        },
        initialValues: {
          params: getParams(),
        },
      }),
    [getParams, onCloseAlertFlyout, triggersActionsUi, alertFlyoutVisible]
  );

  // in render section of component
  return (
    <>
      {AddAlertFlyout}
      <EuiButton
        fill
        iconType="plusInCircle"
        iconSide="left"
        onClick={() => setAlertFlyoutVisibility(true)}
      >
        <FormattedMessage id="emptyButton" defaultMessage="Create threshold alert" />
      </EuiButton>
    </>
  );
};
