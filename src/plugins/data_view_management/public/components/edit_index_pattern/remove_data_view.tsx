/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient, OverlayStart } from 'src/core/public';
import { asyncForEach } from '@kbn/std';
import { toMountPoint } from '../../../../../plugins/kibana_react/public';
import { DataViewsPublicPluginStart } from '../../../../../plugins/data_views/public';

const confirmModalOptionsDelete = {
  confirmButtonText: i18n.translate('indexPatternManagement.editIndexPattern.deleteButton', {
    defaultMessage: 'Delete',
  }),
  title: i18n.translate('indexPatternManagement.editDataView.deleteHeader', {
    defaultMessage: 'Delete data view',
  }),
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
  (dataViewArray: RemoveDataViewProps[]) => {
    const dataView = dataViewArray[0];
    async function doRemove() {
      await asyncForEach(dataViewArray, async ({ id }) => dataViews.delete(id));
      onDelete();
    }

    // todo change warning
    const warning =
      dataView.namespaces && dataView.namespaces.length > 1 ? (
        <FormattedMessage
          id="indexPatternManagement.editDataView.deleteWarning"
          defaultMessage="When you delete {dataViewName}, you remove it from every space it is shared in. You can't undo this action."
          values={{
            dataViewName: <EuiCode>{dataView.title}</EuiCode>,
          }}
        />
      ) : (
        ''
      );

    overlays
      .openConfirm(toMountPoint(<div>{warning}</div>), confirmModalOptionsDelete)
      .then((isConfirmed) => {
        if (isConfirmed) {
          doRemove();
        }
      });
  };
