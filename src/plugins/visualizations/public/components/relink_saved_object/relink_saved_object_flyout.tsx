/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutProps,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiConfirmModal,
  EuiButtonEmpty,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { SavedObjectFinderUi, SavedObjectFinderUiProps } from '@kbn/saved-objects-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { RelinkSavedObjectFlyoutBanner } from './relink_saved_object_flyout_banner';
import type {
  RelinkSimpleSavedObject,
  RelinkSavedObjectMeta,
  RelinkSimpleSavedDeps,
} from './types';
import type { GetSavedObjectMetaDataForFinderUI } from './finder_ui_metadata';

interface RelinkSavedObjectFlyoutProps {
  title: string;
  savedObject: RelinkSimpleSavedObject;
  rootSavedObjectMeta: RelinkSavedObjectMeta;
  missedSavedObjectMeta: RelinkSavedObjectMeta;
  onClose: EuiFlyoutProps['onClose'];
  onChoose: (selectedSavedObjectId: string) => void;
  getSavedObjectMetaDataForFinderUI: GetSavedObjectMetaDataForFinderUI;
}

export const RelinkSavedObjectFlyout = ({
  onClose,
  title,
  savedObject,
  rootSavedObjectMeta,
  missedSavedObjectMeta,
  onChoose,
  getSavedObjectMetaDataForFinderUI,
}: RelinkSavedObjectFlyoutProps) => {
  const { services } = useKibana<RelinkSimpleSavedDeps>();
  const [selectedSavedObject, setSelectedSavedObject] = useState<string>();
  const bannerFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'bannerFlyoutTitle',
  });

  const onSavedObjectSelected: SavedObjectFinderUiProps['onChoose'] = useCallback((value) => {
    setSelectedSavedObject(value);
  }, []);

  const savedObjectMetaDataForFinderUI = useMemo(
    () => getSavedObjectMetaDataForFinderUI(missedSavedObjectMeta.type),
    [getSavedObjectMetaDataForFinderUI, missedSavedObjectMeta.type]
  );

  return (
    <>
      <EuiFlyout ownFocus onClose={onClose} aria-labelledby={bannerFlyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={bannerFlyoutTitleId}>{title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          banner={
            <RelinkSavedObjectFlyoutBanner
              savedObject={savedObject}
              rootSavedObjectMeta={rootSavedObjectMeta}
              missedSavedObjectMeta={missedSavedObjectMeta}
            />
          }
        >
          <SavedObjectFinderUi
            key="savedObjectFinder"
            onChoose={onSavedObjectSelected}
            showFilter
            noItemsMessage={i18n.translate(
              'visualizations.relinkSavedObjectFlyout.noMatchingItems',
              {
                defaultMessage: 'No matching items found.',
              }
            )}
            savedObjectMetaData={savedObjectMetaDataForFinderUI}
            uiSettings={services.uiSettings}
            savedObjects={services.savedObjects}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            {i18n.translate('visualizations.relinkSavedObjectFlyout.close', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {selectedSavedObject ? (
        <EuiConfirmModal
          title="Do this thing"
          onCancel={() => setSelectedSavedObject(undefined)}
          onConfirm={() => onChoose(selectedSavedObject)}
          cancelButtonText={i18n.translate(
            'visualizations.relinkSavedObjectFlyout.cancelButtonText',
            {
              defaultMessage: "No, don't do it",
            }
          )}
          confirmButtonText={i18n.translate(
            'visualizations.relinkSavedObjectFlyout.confirmButtonText',
            {
              defaultMessage: 'Yes, do it',
            }
          )}
          defaultFocusedButton="confirm"
        >
          {i18n.translate('visualizations.relinkSavedObjectFlyout.confirm', {
            defaultMessage: 'Do you really want to update references?',
          })}
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
