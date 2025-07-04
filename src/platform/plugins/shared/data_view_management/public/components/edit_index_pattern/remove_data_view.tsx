/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient, OverlayStart } from '@kbn/core/public';
import { asyncForEach } from '@kbn/std';
import { EuiConfirmModalProps } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { StartServices } from '../../types';

const confirmModalOptionsDelete = {
  confirmButtonText: i18n.translate('indexPatternManagement.editIndexPattern.deleteButton', {
    defaultMessage: 'Delete',
  }),
  title: i18n.translate('indexPatternManagement.editDataView.deleteHeader', {
    defaultMessage: 'Delete data view',
  }),
  buttonColor: 'danger' as EuiConfirmModalProps['buttonColor'],
};

export interface RemoveDataViewProps {
  id: string;
  title: string;
  namespaces?: string[] | undefined;
  name?: string;
  getName: () => string;
}

interface RemoveDataViewDeps {
  dataViews: DataViewsPublicPluginStart;
  uiSettings: IUiSettingsClient;
  overlays: OverlayStart;
  onDelete: () => void;
  startServices: StartServices;
}

export const removeDataView =
  ({ dataViews, overlays, onDelete, startServices }: RemoveDataViewDeps) =>
  (dataViewArray: RemoveDataViewProps[], msg: JSX.Element) => {
    overlays
      .openConfirm(toMountPoint(msg, startServices), confirmModalOptionsDelete)
      .then(async (isConfirmed) => {
        if (isConfirmed) {
          await asyncForEach(dataViewArray, async ({ id }) => dataViews.delete(id));
          onDelete();
        }
      });
  };
