/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { OverlayStart } from '@kbn/core/public';

interface EditDataViewDeps {
  dataViewName: string;
  overlays: OverlayStart | undefined;
  onEdit: () => void;
}

export const editDataViewModal = ({
  dataViewName,
  overlays,
  onEdit,
}: EditDataViewDeps): Promise<void> =>
  overlays
    ? overlays
        .openConfirm(
          i18n.translate('indexPatternEditor.editDataView.editConfirmationModal.modalDescription', {
            defaultMessage: 'Changing this data view can break other objects that depend on it.',
          }),
          {
            confirmButtonText: i18n.translate(
              'indexPatternEditor.editDataView.editConfirmationModal.confirmButton',
              {
                defaultMessage: 'Confirm',
              }
            ),
            title: i18n.translate(
              'indexPatternEditor.editDataView.editConfirmationModal.editHeader',
              {
                defaultMessage: `Edit ''{name}''`,
                values: {
                  name: dataViewName,
                },
              }
            ),
            buttonColor: 'danger',
          }
        )
        .then(async (isConfirmed) => {
          if (isConfirmed) {
            await onEdit();
          }
        })
    : Promise.resolve();
