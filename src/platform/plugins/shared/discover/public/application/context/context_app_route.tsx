/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { generateFilters } from '@kbn/data-plugin/public';
import { popularizeField } from '@kbn/unified-data-table';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { ContextApp } from './context_app';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { useDataView } from '../../hooks/use_data_view';
import type { ContextHistoryLocationState } from './services/locator';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { DiscoverContextAwarenessToolkit } from '../../context_awareness';
import { useRootProfile } from '../../context_awareness';
import { ScopedServicesProvider } from '../../components/scoped_services_provider';

export interface ContextUrlParams {
  dataViewId: string;
  id: string;
}

export function ContextAppRoute() {
  const services = useDiscoverServices();
  const {
    profilesManager,
    ebtManager,
    getScopedHistory,
    filterManager,
    dataViews,
    capabilities,
    fieldsMetadata,
  } = services;
  const scopedHistory = getScopedHistory<ContextHistoryLocationState>();
  const locationState = useMemo(
    () => scopedHistory?.location.state as ContextHistoryLocationState | undefined,
    [scopedHistory?.location.state]
  );

  /**
   * Updates history state when gets undefined.
   * Should be removed once url state will be deleted from context page.
   */
  useEffect(() => {
    const unlisten = scopedHistory?.listen((location) => {
      const currentState = location.state;
      if (!currentState?.referrer && locationState) {
        const newLocation = { ...location, state: { ...currentState, ...locationState } };
        scopedHistory.replace(newLocation);
      }
    });
    return () => unlisten?.();
  }, [locationState, scopedHistory]);

  const { dataViewId: encodedDataViewId, id } = useParams<ContextUrlParams>();
  const dataViewId = decodeURIComponent(encodedDataViewId);
  const anchorId = decodeURIComponent(id);
  const { dataView, error } = useDataView({ index: locationState?.dataViewSpec || dataViewId });
  const [scopedEbtManager] = useState(() => ebtManager.createScopedEBTManager());
  const dataViewRef = useRef(dataView);
  useEffect(() => {
    dataViewRef.current = dataView;
  }, [dataView]);

  const addFilter = useCallback<DocViewFilterFn>(
    (mapping, values, operation) => {
      void (async () => {
        const currentDataView = dataViewRef.current;
        if (!currentDataView || !mapping) {
          return;
        }

        const fieldName = typeof mapping === 'string' ? mapping : mapping.name;
        const newFilters = generateFilters(
          filterManager,
          fieldName,
          values,
          operation,
          currentDataView
        );
        filterManager.addFilters(newFilters);

        if (dataViews) {
          await popularizeField(currentDataView, fieldName, dataViews, capabilities);
          void scopedEbtManager.trackFilterAddition({
            fieldName: fieldName === '_exists_' ? String(values) : fieldName,
            filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
            fieldsMetadata,
          });
        }
      })();
    },
    [capabilities, dataViews, fieldsMetadata, filterManager, scopedEbtManager]
  );

  const toolkit = useMemo<DiscoverContextAwarenessToolkit>(
    () => ({
      actions: {
        addFilter,
      },
    }),
    [addFilter]
  );

  const scopedProfilesManager = useMemo(
    () => profilesManager.createScopedProfilesManager({ scopedEbtManager, toolkit }),
    [profilesManager, scopedEbtManager, toolkit]
  );
  const rootProfileState = useRootProfile();

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.contextViewRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.contextViewRoute.errorMessage"
            defaultMessage="No matching data view for id {dataViewId}"
            values={{ dataViewId }}
          />
        }
      />
    );
  }

  if (!dataView || rootProfileState.rootProfileLoading) {
    return <LoadingIndicator />;
  }

  return (
    <ScopedServicesProvider
      scopedProfilesManager={scopedProfilesManager}
      scopedEBTManager={scopedEbtManager}
    >
      <rootProfileState.AppWrapper>
        <ContextApp
          anchorId={anchorId}
          dataView={dataView}
          referrer={locationState?.referrer}
          addFilter={addFilter}
        />
      </rootProfileState.AppWrapper>
    </ScopedServicesProvider>
  );
}
