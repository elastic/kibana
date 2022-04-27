/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { EuiButton } from '@elastic/eui';
import type { SavedObjectAttributes } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RelinkSavedObjectFlyout } from './relink_saved_object_flyout';
import { relinkSavedObject } from './relink_saved_object_utils';
import type {
  RelinkSimpleSavedObject,
  RelinkSavedObjectMeta,
  RelinkSimpleSavedDeps,
} from './types';

import {
  getDefaultSavedObjectMetaDataForFinderUI,
  GetSavedObjectMetaDataForFinderUI,
} from './finder_ui_metadata';

export interface RelinkSavedObjectProps {
  rootSavedObjectMeta: RelinkSavedObjectMeta;
  missedSavedObjectMeta: RelinkSavedObjectMeta;
  onRelink?: (selectedSavedObjectId: string) => void;
  services: RelinkSimpleSavedDeps;
  getSavedObjectMetaDataForFinderUI?: GetSavedObjectMetaDataForFinderUI;
}

export const RelinkSavedObject = ({
  services,
  rootSavedObjectMeta,
  missedSavedObjectMeta,
  onRelink,
  getSavedObjectMetaDataForFinderUI = getDefaultSavedObjectMetaDataForFinderUI,
}: RelinkSavedObjectProps) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedObject, setSavedObject] = useState<RelinkSimpleSavedObject>();

  useEffect(() => {
    const getAsync = async () => {
      try {
        setSavedObject(
          (
            await services.savedObjects.client.resolve<SavedObjectAttributes>(
              rootSavedObjectMeta.type,
              rootSavedObjectMeta.id
            )
          ).saved_object
        );
      } finally {
        setIsLoading(false);
      }
    };
    getAsync();
  }, [rootSavedObjectMeta.id, rootSavedObjectMeta.type, services.savedObjects.client]);

  const title = useMemo(
    () =>
      i18n.translate('visualizations.relinkSavedObject.title', {
        defaultMessage: 'Rewire the {type}',
        values: {
          type: missedSavedObjectMeta.name ?? missedSavedObjectMeta.type,
        },
      }),
    [missedSavedObjectMeta.name, missedSavedObjectMeta.type]
  );

  const onChoose = useCallback(
    async (selectedSavedObjectId: string) => {
      setIsFlyoutVisible(false);
      setIsLoading(true);
      try {
        await relinkSavedObject(savedObject!, missedSavedObjectMeta.id, selectedSavedObjectId, {
          savedObjectsClient: services.savedObjects.client,
        });
        onRelink?.(selectedSavedObjectId);
      } finally {
        setIsLoading(false);
      }
    },
    [missedSavedObjectMeta.id, onRelink, savedObject, services.savedObjects.client]
  );

  const toggleFlyout = useCallback(() => setIsFlyoutVisible(!isFlyoutVisible), [isFlyoutVisible]);

  return (
    <KibanaContextProvider services={services}>
      <>
        <EuiButton color="warning" size="s" onClick={toggleFlyout} isLoading={isLoading}>
          {title}
        </EuiButton>
        {isFlyoutVisible && savedObject ? (
          <RelinkSavedObjectFlyout
            title={title}
            onClose={toggleFlyout}
            onChoose={onChoose}
            savedObject={savedObject}
            rootSavedObjectMeta={rootSavedObjectMeta}
            missedSavedObjectMeta={missedSavedObjectMeta}
            getSavedObjectMetaDataForFinderUI={getSavedObjectMetaDataForFinderUI}
          />
        ) : null}
      </>
    </KibanaContextProvider>
  );
};
