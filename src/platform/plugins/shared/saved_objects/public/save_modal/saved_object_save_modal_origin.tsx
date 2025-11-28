/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSwitch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { OnSaveProps, SaveModalState, SaveResult } from '.';
import { SavedObjectSaveModalWithSaveResult } from '.';

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
  onSave: (
    props: OnSaveProps & { returnToOrigin: boolean; newProjectRoutingRestore?: boolean }
  ) => Promise<SaveResult>;
  projectRoutingRestore?: boolean;
  showStoreProjectRoutingOnSave?: boolean;
}

export function SavedObjectSaveModalOrigin(props: OriginSaveModalProps) {
  const [returnToOriginMode, setReturnToOriginMode] = useState(Boolean(props.originatingApp));
  const [persistSelectedProjectRouting, setPersistSelectedProjectRouting] = useState(
    props.projectRoutingRestore ?? false
  );
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

    const projectRoutingOptions = props.showStoreProjectRoutingOnSave ? (
      <EuiFormRow>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="storeProjectRoutingWithVisualization"
              checked={persistSelectedProjectRouting}
              onChange={(event) => setPersistSelectedProjectRouting(event.target.checked)}
              label={
                <FormattedMessage
                  id="savedObjects.saveModalOrigin.storeProjectRoutingFormRowLabel"
                  defaultMessage="Store project routing with {objectType}"
                  values={{ objectType: props.objectType }}
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    ) : null;

    if (!props.originatingApp) {
      return (
        <Fragment>
          {sourceOptions}
          {projectRoutingOptions}
        </Fragment>
      );
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
          {projectRoutingOptions}
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
      return (
        <Fragment>
          {sourceOptions}
          {projectRoutingOptions}
        </Fragment>
      );
    }
  };

  const onModalSave = async (onSaveProps: OnSaveProps): Promise<SaveResult> => {
    return props.onSave({
      ...onSaveProps,
      returnToOrigin: returnToOriginMode,
      newProjectRoutingRestore: props.showStoreProjectRoutingOnSave
        ? persistSelectedProjectRouting
        : undefined,
    });
  };

  const confirmButtonLabel = returnToOriginMode
    ? i18n.translate('savedObjects.saveModalOrigin.saveAndReturnLabel', {
        defaultMessage: 'Save and return',
      })
    : null;

  return (
    <SavedObjectSaveModalWithSaveResult
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
