/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  OnSaveProps,
  SaveModalState,
  SavedObjectSaveModal,
} from '../../../../plugins/saved_objects/public';

import './saved_object_save_modal_dashboard.scss';
import { pluginServices } from '../services';
import { SaveModalDashboardSelector } from './saved_object_save_modal_dashboard_selector';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface SaveModalDashboardProps {
  documentInfo: SaveModalDocumentInfo;
  objectType: string;
  onClose: () => void;
  onSave: (props: OnSaveProps & { dashboardId: string | null }) => void;
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
}

export function SavedObjectSaveModalDashboard(props: SaveModalDashboardProps) {
  const { documentInfo, tagOptions, objectType, onClose } = props;
  const { id: documentId } = documentInfo;
  const initialCopyOnSave = !Boolean(documentId);

  const { capabilities } = pluginServices.getHooks();
  const {
    canAccessDashboards,
    canCreateNewDashboards,
    canEditDashboards,
  } = capabilities.useService();

  const disableDashboardOptions =
    !canAccessDashboards() || (!canCreateNewDashboards && !canEditDashboards);

  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing' | null>(
    documentId || disableDashboardOptions ? null : 'existing'
  );
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );
  const [copyOnSave, setCopyOnSave] = useState<boolean>(initialCopyOnSave);

  const rightOptions = !disableDashboardOptions
    ? () => (
        <SaveModalDashboardSelector
          onSelectDashboard={(dash) => {
            setSelectedDashboard(dash);
          }}
          onChange={(option) => {
            setDashboardOption(option);
          }}
          {...{ copyOnSave, documentId, dashboardOption }}
        />
      )
    : null;

  const onCopyOnSaveChange = (newCopyOnSave: boolean) => {
    setDashboardOption(null);
    setCopyOnSave(newCopyOnSave);
  };

  const onModalSave = (onSaveProps: OnSaveProps) => {
    let dashboardId = null;

    // Don't save with a dashboard ID if we're
    // just updating an existing visualization
    if (!(!onSaveProps.newCopyOnSave && documentId)) {
      if (dashboardOption === 'existing') {
        dashboardId = selectedDashboard?.id || null;
      } else {
        dashboardId = dashboardOption;
      }
    }

    props.onSave({ ...onSaveProps, dashboardId });
  };

  const saveLibraryLabel =
    !copyOnSave && documentId
      ? i18n.translate('presentationUtil.saveModalDashboard.saveLabel', {
          defaultMessage: 'Save',
        })
      : i18n.translate('presentationUtil.saveModalDashboard.saveToLibraryLabel', {
          defaultMessage: 'Save and add to library',
        });

  const saveDashboardLabel = i18n.translate(
    'presentationUtil.saveModalDashboard.saveAndGoToDashboardLabel',
    {
      defaultMessage: 'Save and go to Dashboard',
    }
  );

  const confirmButtonLabel = dashboardOption === null ? saveLibraryLabel : saveDashboardLabel;

  const isValid = !(dashboardOption === 'existing' && selectedDashboard === null);

  return (
    <SavedObjectSaveModal
      onSave={onModalSave}
      title={documentInfo.title}
      showCopyOnSave={documentId ? true : false}
      options={dashboardOption === null ? tagOptions : undefined} // Show tags when not adding to dashboard
      description={documentInfo.description}
      showDescription={true}
      {...{
        confirmButtonLabel,
        initialCopyOnSave,
        isValid,
        objectType,
        onClose,
        onCopyOnSaveChange,
        rightOptions,
      }}
    />
  );
}
