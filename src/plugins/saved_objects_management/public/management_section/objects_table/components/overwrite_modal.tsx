/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, ReactNode } from 'react';
import {
  EuiOverlayMask,
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiText,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { FailedImportConflict } from '../../../lib/resolve_import_errors';
import { getDefaultTitle } from '../../../lib';

export interface OverwriteModalProps {
  conflict: FailedImportConflict;
  onFinish: (overwrite: boolean, destinationId?: string) => void;
}

export const OverwriteModal = ({ conflict, onFinish }: OverwriteModalProps) => {
  const { obj, error } = conflict;
  let initialDestinationId: string | undefined;
  let selectControl: ReactNode = null;
  if (error.type === 'conflict') {
    initialDestinationId = error.destinationId;
  } else {
    // ambiguous conflict must have at least two destinations; default to the first one
    initialDestinationId = error.destinations[0].id;
  }
  const [destinationId, setDestinationId] = useState(initialDestinationId);

  if (error.type === 'ambiguous_conflict') {
    const selectProps = {
      options: error.destinations.map((destination) => {
        const header = destination.title ?? `${type} [id=${destination.id}]`;
        const lastUpdated = destination.updatedAt
          ? moment(destination.updatedAt).fromNow()
          : 'never';
        const idText = `ID: ${destination.id}`;
        const lastUpdatedText = `Last updated: ${lastUpdated}`;
        return {
          value: destination.id,
          inputDisplay: destination.id,
          dropdownDisplay: (
            <Fragment>
              <strong>{header}</strong>
              <EuiText size="s" color="subdued">
                <p className="euiTextColor--subdued">
                  {idText}
                  <br />
                  {lastUpdatedText}
                </p>
              </EuiText>
            </Fragment>
          ),
        };
      }),
      onChange: (value: string) => {
        setDestinationId(value);
      },
    };
    selectControl = (
      <EuiSuperSelect
        options={selectProps.options}
        valueOfSelected={destinationId}
        onChange={selectProps.onChange}
        prepend={i18n.translate(
          'savedObjectsManagement.objectsTable.overwriteModal.selectControlLabel',
          { defaultMessage: 'Object ID' }
        )}
        hasDividers
        fullWidth
        compressed
      />
    );
  }

  const { type, meta } = obj;
  const title = meta.title || getDefaultTitle(obj);
  const bodyText =
    error.type === 'conflict'
      ? i18n.translate('savedObjectsManagement.objectsTable.overwriteModal.body.conflict', {
          defaultMessage: '"{title}" conflicts with an existing object. Overwrite it?',
          values: { title },
        })
      : i18n.translate(
          'savedObjectsManagement.objectsTable.overwriteModal.body.ambiguousConflict',
          {
            defaultMessage: '"{title}" conflicts with multiple existing objects. Overwrite one?',
            values: { title },
          }
        );
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('savedObjectsManagement.objectsTable.overwriteModal.title', {
          defaultMessage: 'Overwrite {type}?',
          values: { type },
        })}
        cancelButtonText={i18n.translate(
          'savedObjectsManagement.objectsTable.overwriteModal.cancelButtonText',
          { defaultMessage: 'Skip' }
        )}
        confirmButtonText={i18n.translate(
          'savedObjectsManagement.objectsTable.overwriteModal.overwriteButtonText',
          { defaultMessage: 'Overwrite' }
        )}
        buttonColor="danger"
        onCancel={() => onFinish(false)}
        onConfirm={() => onFinish(true, destinationId)}
        defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        maxWidth="500px"
      >
        <p>{bodyText}</p>
        {selectControl}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
