/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import React from 'react';
import { ControlGroupApi, ControlGroupRuntimeState } from '../types';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

export const ControlsEditor = ({
  stateManager,
  isCreate,
  onSubmit,
  onCancel,
  api,
}: {
  stateManager: StateManager<ControlGroupRuntimeState>;
  isCreate: boolean;
  onSubmit: (addToLibrary: boolean) => Promise<void>;
  onCancel: () => void;
  api?: ControlGroupApi;
}) => {
  const [controls] = useBatchedPublishingSubjects(stateManager.api.controls$);
  // const [addToLibrary, setAddToLibrary] = useState(Boolean(api?.getSavedBookId()));
  // const [saving, setSaving] = useState(false);
  console.log(controls);
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isCreate
              ? i18n.translate('embeddableExamples.savedBook.editor.newTitle', {
                  defaultMessage: 'Create new book',
                })
              : i18n.translate('embeddableExamples.savedBook.editor.editTitle', {
                  defaultMessage: 'Edit book',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {Object.values(controls).map(({ type }, i) => {
          return <>{type}</>;
        })}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>Here 2</EuiFlyoutFooter>
    </>
  );
};
