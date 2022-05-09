/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient, OverlayStart } from '@kbn/core/public';
import { asyncForEach } from '@kbn/std';
import { EuiConfirmModalProps } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

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
}

interface RemoveDataViewDeps {
  dataViews: DataViewsPublicPluginStart;
  uiSettings: IUiSettingsClient;
  overlays: OverlayStart;
  onDelete: () => void;
}

export const removeDataView =
  ({ dataViews, overlays, onDelete }: RemoveDataViewDeps) =>
  (dataViewArray: RemoveDataViewProps[], msg: JSX.Element) => {
    overlays.openConfirm(toMountPoint(msg), confirmModalOptionsDelete).then(async (isConfirmed) => {
      if (isConfirmed) {
        await asyncForEach(dataViewArray, async ({ id }) => dataViews.delete(id));
        onDelete();
      }
    });
  };
