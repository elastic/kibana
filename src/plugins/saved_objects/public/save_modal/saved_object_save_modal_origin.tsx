/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { OnSaveProps, SaveModalState, SavedObjectSaveModal } from '.';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface OriginSaveModalProps {
  originatingApp?: string;
  getAppNameFromId?: (appId: string) => string | undefined;
  originatingAppName?: string;
  returnToOriginSwitchLabel?: string;
  documentInfo: SaveModalDocumentInfo;
  objectType: string;
  onClose: () => void;
  options?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
  onSave: (props: OnSaveProps & { returnToOrigin: boolean }) => void;
}

export function SavedObjectSaveModalOrigin(props: OriginSaveModalProps) {
  const [returnToOriginMode, setReturnToOriginMode] = useState(Boolean(props.originatingApp));
  const { documentInfo } = props;

  const returnLabel = i18n.translate('savedObjects.saveModalOrigin.returnToOriginLabel', {
    defaultMessage: 'Return',
  });
  const addLabel = i18n.translate('savedObjects.saveModalOrigin.addToOriginLabel', {
    defaultMessage: 'Add',
  });

  const getReturnToOriginSwitch = (state: SaveModalState) => {
    const sourceOptions =
      typeof props.options === 'function' ? props.options(state) : props.options;

    if (!props.originatingApp) {
      return sourceOptions;
    }
    const origin = props.getAppNameFromId
      ? props.getAppNameFromId(props.originatingApp) || props.originatingApp
      : props.originatingApp;

    if (
      !state.copyOnSave ||
      props.originatingApp === 'dashboards' // dashboard supports adding a copied panel on save...
    ) {
      const originVerb = !documentInfo.id || state.copyOnSave ? addLabel : returnLabel;
      return (
        <Fragment>
          {sourceOptions}
          <EuiFormRow>
            <EuiSwitch
              data-test-subj="returnToOriginModeSwitch"
              checked={returnToOriginMode}
              onChange={(event) => {
                setReturnToOriginMode(event.target.checked);
              }}
              label={
                props.returnToOriginSwitchLabel ?? (
                  <FormattedMessage
                    id="savedObjects.saveModalOrigin.originAfterSavingSwitchLabel"
                    defaultMessage="{originVerb} to {origin} after saving"
                    values={{ originVerb, origin }}
                  />
                )
              }
            />
          </EuiFormRow>
        </Fragment>
      );
    } else {
      setReturnToOriginMode(false);
      return sourceOptions;
    }
  };

  const onModalSave = (onSaveProps: OnSaveProps) => {
    props.onSave({ ...onSaveProps, returnToOrigin: returnToOriginMode });
  };

  const confirmButtonLabel = returnToOriginMode
    ? i18n.translate('savedObjects.saveModalOrigin.saveAndReturnLabel', {
        defaultMessage: 'Save and return',
      })
    : null;

  return (
    <SavedObjectSaveModal
      onSave={onModalSave}
      onClose={props.onClose}
      title={documentInfo.title}
      showCopyOnSave={documentInfo.id ? true : false}
      initialCopyOnSave={Boolean(documentInfo.id) && returnToOriginMode}
      confirmButtonLabel={confirmButtonLabel}
      objectType={props.objectType}
      options={getReturnToOriginSwitch}
      description={documentInfo.description}
      showDescription={true}
    />
  );
}
