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

import React, { useState, useRef, useEffect } from 'react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { OverlayStart, CoreStart, IUiSettingsClient, SavedObjectsStart } from 'kibana/public';
import { EmbeddableExamplesStart } from 'examples/embeddable_examples/public/plugin';
import { EuiButton } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';
import { getSavedObjectFinder } from '../../../src/plugins/saved_objects/public';
import {
  EmbeddableStart,
  ViewMode,
  EmbeddablePanel,
  IEmbeddable,
} from '../../../src/plugins/embeddable/public';
import {
  TODO_SO_EMBEDDABLE,
  TodoSoEmbeddableOutput,
  TodoSoEmbeddable,
  SEARCHABLE_LIST_CONTAINER,
  TodoSoEmbeddableInput,
} from '../../embeddable_examples/public';

interface Props {
  getAllEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  uiActionsApi: UiActionsStart;
  overlays: OverlayStart;
  notifications: CoreStart['notifications'];
  inspector: InspectorStart;
  savedObject: SavedObjectsStart;
  uiSettingsClient: IUiSettingsClient;
  createSampleData: EmbeddableExamplesStart['createSampleData'];
}

export function SavedObjectEmbeddableExample({
  inspector,
  notifications,
  overlays,
  getAllEmbeddableFactories,
  getEmbeddableFactory,
  uiActionsApi,
  savedObject,
  uiSettingsClient,
  createSampleData,
}: Props) {
  const searchableInput = {
    id: '1',
    title: 'My searchable todo list',
    viewMode: ViewMode.EDIT,
    savedObjectId: 'sample-list-saved-object',
  };

  const [container, setContainer] = useState<IEmbeddable | undefined>(undefined);
  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    if (!container) {
      const factory = getEmbeddableFactory(SEARCHABLE_LIST_CONTAINER);
      const promise = factory?.create(searchableInput);
      if (promise) {
        promise.then(e => {
          if (ref.current) {
            setContainer(e);
          }
        });
      }
    }

    if (!embeddable) {
      const factory = getEmbeddableFactory<
        TodoSoEmbeddableInput,
        TodoSoEmbeddableOutput,
        TodoSoEmbeddable
      >(TODO_SO_EMBEDDABLE);
      const promise = factory?.create({
        savedObjectId: 'sample-todo-saved-object',
        id: '123',
        title: 'Garbage',
      });
      if (promise) {
        promise.then(e => {
          if (ref.current) {
            setEmbeddable(e);
          }
        });
      }
    }
    return () => {
      ref.current = false;
    };
  });

  const onCreateSampleDataClick = async () => {
    setLoading(true);
    await createSampleData(true);
    if (embeddable) embeddable.reload();
    if (container) container.reload();
    setLoading(false);
  };

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Saved object embeddable example</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            <EuiButton data-test-subj="reset-sample-data" onClick={onCreateSampleDataClick}>
              {loading ? <EuiLoadingSpinner /> : 'Reset sample data'}
            </EuiButton>
            <p>
              This example showcases an embeddable that is backed by a saved object. Click the
              context meny and click Edit todo item to see how to edit and update the saved object.
              Refreshing the page after editing this embeddable will preserve your edits.
            </p>
          </EuiText>

          <EuiSpacer />
          {embeddable ? (
            <EmbeddablePanel
              embeddable={embeddable}
              getActions={uiActionsApi.getTriggerCompatibleActions}
              getEmbeddableFactory={getEmbeddableFactory}
              getAllEmbeddableFactories={getAllEmbeddableFactories}
              overlays={overlays}
              notifications={notifications}
              inspector={inspector}
              SavedObjectFinder={getSavedObjectFinder(savedObject, uiSettingsClient)}
            />
          ) : (
            <EuiText>Loading...</EuiText>
          )}
          <EuiSpacer />
          <EuiText>
            <p>
              This next example showcases another embeddable that is backed by a saved object, and
              one that has children that can optionally be backed by a saved object. The first child
              is linked to a saved object. The second child has input that does not include a saved
              object id, so it is by value. Click the context menu and you can see how to turn the
              by value version into a saved object.
            </p>
          </EuiText>
          <EuiSpacer />
          {container ? (
            <EmbeddablePanel
              embeddable={container}
              getActions={uiActionsApi.getTriggerCompatibleActions}
              getEmbeddableFactory={getEmbeddableFactory}
              getAllEmbeddableFactories={getAllEmbeddableFactories}
              overlays={overlays}
              notifications={notifications}
              inspector={inspector}
              SavedObjectFinder={getSavedObjectFinder(savedObject, uiSettingsClient)}
            />
          ) : (
            <EuiText>Loading...</EuiText>
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
