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

import React, { useState, useEffect, useRef } from 'react';
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
import { EmbeddableStart, IEmbeddable } from '../../../src/plugins/embeddable/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  TODO_EMBEDDABLE,
  BOOK_EMBEDDABLE,
  MULTI_TASK_TODO_EMBEDDABLE,
  SearchableListContainerFactory,
} from '../../embeddable_examples/public';

interface Props {
  embeddableServices: EmbeddableStart;
  searchListContainerFactory: SearchableListContainerFactory;
}

export function EmbeddablePanelExample({ embeddableServices, searchListContainerFactory }: Props) {
  const searchableInput = {
    id: '1',
    title: 'My searchable todo list',
    panels: {
      '1': {
        type: HELLO_WORLD_EMBEDDABLE,
        explicitInput: {
          id: '1',
          title: 'Hello',
        },
      },
      '2': {
        type: TODO_EMBEDDABLE,
        explicitInput: {
          id: '2',
          task: 'Goes out on Wednesdays!',
          icon: 'broom',
          title: 'Take out the trash',
        },
      },
      '3': {
        type: MULTI_TASK_TODO_EMBEDDABLE,
        explicitInput: {
          id: '3',
          icon: 'searchProfilerApp',
          title: 'Learn more',
          tasks: ['Go to school', 'Watch planet earth', 'Read the encyclopedia'],
        },
      },
      '4': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '4',
          savedObjectId: 'sample-book-saved-object',
        },
      },
      '5': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '5',
          attributes: {
            title: 'The Sympathizer',
            author: 'Viet Thanh Nguyen',
            readIt: true,
          },
        },
      },
      '6': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '6',
          attributes: {
            title: 'The Hobbit',
            author: 'J.R.R. Tolkien',
            readIt: false,
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
      const promise = searchListContainerFactory.create(searchableInput);
      if (promise) {
        promise.then((e) => {
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
            <h1>The embeddable panel component</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            You can render your embeddable inside the EmbeddablePanel component. This adds some
            extra rendering and offers a context menu with pluggable actions. Using EmbeddablePanel
            to render your embeddable means you get access to the &quot;Add panel flyout&quot;. Now
            you can see how to add embeddables to your container, and how
            &quot;getExplicitInput&quot; is used to grab input not provided by the container.
          </EuiText>
          <EuiPanel data-test-subj="embeddedPanelExample" paddingSize="none" role="figure">
            {embeddable ? (
              <embeddableServices.EmbeddablePanel embeddable={embeddable} />
            ) : (
              <EuiText>Loading...</EuiText>
            )}
          </EuiPanel>

          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
