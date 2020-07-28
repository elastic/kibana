/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { OnSaveProps, SaveModalState, SavedObjectSaveModal } from '.';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

interface OriginSaveModalProps {
  originatingApp?: string;
  documentInfo: SaveModalDocumentInfo;
  objectType: string;
  onClose: () => void;
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
    if (!props.originatingApp) {
      return;
    }
    let origin = props.originatingApp!;

    // TODO: Remove this after https://github.com/elastic/kibana/pull/63443
    if (origin.startsWith('kibana:')) {
      origin = origin.split(':')[1];
    }

    if (
      !state.copyOnSave ||
      origin === 'dashboards' // dashboard supports adding a copied panel on save...
    ) {
      const originVerb = !documentInfo.id || state.copyOnSave ? addLabel : returnLabel;
      return (
        <Fragment>
          <EuiFormRow>
            <EuiSwitch
              data-test-subj="returnToOriginModeSwitch"
              checked={returnToOriginMode}
              onChange={(event) => {
                setReturnToOriginMode(event.target.checked);
              }}
              label={
                <FormattedMessage
                  id="savedObjects.saveModalOrigin.originAfterSavingSwitchLabel"
                  defaultMessage="{originVerb} to {origin} after saving"
                  values={{ originVerb, origin }}
                />
              }
            />
          </EuiFormRow>
        </Fragment>
      );
    } else {
      setReturnToOriginMode(false);
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
