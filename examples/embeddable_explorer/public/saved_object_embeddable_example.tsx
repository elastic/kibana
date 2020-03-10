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
  EuiPanel,
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
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';
import { getSavedObjectFinder } from '../../../src/plugins/saved_objects/public';
import {
  EmbeddableStart,
  ViewMode,
  EmbeddablePanel,
  IEmbeddable,
} from '../../../src/plugins/embeddable/public';
import { TODO_SO_EMBEDDABLE, SEARCHABLE_LIST_CONTAINER } from '../../embeddable_examples/public';

interface Props {
  getAllEmbeddableFactories: EmbeddableStart['getEmbeddableFactories'];
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  uiActionsApi: UiActionsStart;
  overlays: OverlayStart;
  notifications: CoreStart['notifications'];
  inspector: InspectorStart;
  savedObject: SavedObjectsStart;
  uiSettingsClient: IUiSettingsClient;
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
}: Props) {
  const searchableInput = {
    id: '1',
    title: 'My searchable todo list',
    viewMode: ViewMode.EDIT,
    panels: {
      '1': {
        type: TODO_SO_EMBEDDABLE,
        explicitInput: {
          id: '1',
          savedObjectId: 'sample-todo-saved-object',
        },
      },
      '2': {
        type: TODO_SO_EMBEDDABLE,
        explicitInput: {
          id: '2',
          attributes: {
            task:
              'Goes out on Wednesdays!  You can save me as a saved object if you like. Just click the edit action.',
            icon: 'broom',
            title: 'Take out the trash (By value example)',
          },
        },
      },
    },
  };

  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    if (!embeddable) {
      const factory = getEmbeddableFactory(SEARCHABLE_LIST_CONTAINER);
      const promise = factory?.create(searchableInput);
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
            <p>
              This example showcases an embeddable that is backed, optionally, by a saved object.
              Click the context meny and click Edit todo item to see how to save by value or by
              reference (e.g. save to library).
            </p>
          </EuiText>

          <EuiSpacer />
          <EuiPanel
            data-test-subj="savedObjectEmbeddedPanelExample"
            paddingSize="none"
            role="figure"
          >
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
          </EuiPanel>
          <EuiSpacer />
          <EuiText>
            <p>
              There currently is no formal way to limit what children can be added to a container.
              If the use case arose, it wouldn&#39;t be difficult. In the mean time, it&#39;s good
              to understand that chilren may ignore input they don&#39;t care about. Likewise the
              container will have to choose what to do when it encounters children that are missing
              certain output variables.
            </p>
          </EuiText>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
