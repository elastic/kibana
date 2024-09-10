/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

export const StateManagementExample = ({ uiActions }: { uiActions: UiActionsStart }) => {
  return (
    <div>
      <EuiCallOut>
        <p>
          Each embeddable manages its own state. The page is only responsible for persisting and
          providing the last persisted state to the embeddable.
        </p>

        <p>
          When the example is first run, there is no embeddable state from a previous session.
          The page displays a button to add a 'book' embeddable that when clicked executes <EuiLink href="https://github.com/elastic/kibana/blob/main/examples/embeddable_examples/public/react_embeddables/saved_book/create_saved_book_action.tsx#L35">ADD_SAVED_BOOK_ACTION_ID action</EuiLink>.
          The action provides the page with unsaved book state by calling <strong>pageApi.addNewPanel</strong>.
        </p>

        <p>
          The page renders the embeddable with <strong>ReactEmbeddableRenderer</strong> component.
          On mount, ReactEmbeddableRenderer component calls <strong>pageApi.getSerializedStateForChild</strong> to get the last saved state.
          ReactEmbeddableRenderer component then calls <strong>pageApi.getRuntimeStateForChild</strong> to get the last session&apos;s unsaved changes.
          ReactEmbeddableRenderer merges last saved state with unsaved changes and passes the merged state to the embeddable factory.
          ReactEmbeddableRender passes the embeddableApi to the page by calling <strong>onApiAvailable</strong>.
        </p>

        <p>
          The page subscribes to <strong>embeddableApi.unsavedChanges</strong> to receive embeddable unsaved changes.
          The page persists unsaved changes in session storage.
          The page provides unsaved changes to the embeddable with <strong>pageApi.getRuntimeStateForChild</strong>.
        </p>

        <p>
          The page gets embeddable state by calling <strong>embeddableApi.serializeState</strong>.
          The page persists embeddable state in session storage.
          The page provides last saved state to the embeddable with <strong>getSerializedStateForChild</strong>.
        </p>
      </EuiCallOut>
    </div>
  );
};
