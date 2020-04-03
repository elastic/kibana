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
  EuiSpacer,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import {
  EmbeddableStart,
  ViewMode,
  IEmbeddable,
  ContainerOutput,
} from '../../../src/plugins/embeddable/public';
import {
  SEARCHABLE_LIST_CONTAINER,
  NoteEmbeddableInput,
  NOTE_EMBEDDABLE,
  NoteEmbeddableOutput,
  NoteEmbeddable,
  SearchableContainerInput,
  EmbeddableExamplesStart,
  SearchableListContainer,
} from '../../embeddable_examples/public';

interface Props {
  embeddableServices: EmbeddableStart;
  createSampleData: EmbeddableExamplesStart['createSampleData'];
}

export function SavedObjectEmbeddableExample({ embeddableServices, createSampleData }: Props) {
  const searchableInput = {
    id: '1',
    title: 'My searchable todo list',
    viewMode: ViewMode.EDIT,
    panels: {
      '1': {
        type: NOTE_EMBEDDABLE,
        explicitInput: {
          id: '1',
          savedObjectId: 'sample-note-saved-object',
        },
      },
      '2': {
        type: NOTE_EMBEDDABLE,
        explicitInput: {
          id: '2',
          attributes: {
            message: 'How are you feeling today?',
            to: 'Joe',
            from: 'Mary',
          },
        },
      },
    },
  };

  const [container, setContainer] = useState<IEmbeddable | undefined>(undefined);
  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    const loadData = async () => {
      try {
        await createSampleData(false);
      } catch (e) {
        // eslint-disable-next-line
        console.log(e);
      }

      if (!container) {
        const factory = embeddableServices.getEmbeddableFactory<
          SearchableContainerInput,
          ContainerOutput,
          SearchableListContainer
        >(SEARCHABLE_LIST_CONTAINER);
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
        const factory = embeddableServices.getEmbeddableFactory<
          NoteEmbeddableInput,
          NoteEmbeddableOutput,
          NoteEmbeddable
        >(NOTE_EMBEDDABLE);
        const promise = factory?.create({
          savedObjectId: 'sample-note-saved-object',
          id: '123',
        });
        if (promise) {
          promise.then(e => {
            if (ref.current) {
              setEmbeddable(e);
            }
          });
        }
      }
    };
    loadData();
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
              {loading ? <EuiLoadingSpinner /> : 'Load sample data'}
            </EuiButton>
            <p>Click load sample data first to get these examples to show up.</p>
            <p>
              This example showcases an embeddable that is backed by a saved object. Click the
              context menu and click Edit action in the context menu to see how to edit and update
              the saved object. Refreshing the page after editing this embeddable will preserve your
              edits.
            </p>
          </EuiText>

          <EuiSpacer />
          {embeddable ? (
            <embeddableServices.EmbeddablePanel embeddable={embeddable} />
          ) : (
            <EuiText>Loading...</EuiText>
          )}
          <EuiSpacer />
          <EuiText>
            <p>
              This next example showcases a container embeddable that has children that can
              optionally be backed by a saved object. The first child is linked to a saved object.
              The second child has input that does not include a saved object id, so it is by value.
              Click the context menu and you can see how to turn the by value version into a saved
              object.
            </p>
          </EuiText>
          <EuiSpacer />
          {container ? (
            <embeddableServices.EmbeddablePanel embeddable={container} />
          ) : (
            <EuiText>Loading...</EuiText>
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
