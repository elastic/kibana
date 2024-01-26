/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiPageTemplate, EuiCodeBlock } from '@elastic/eui';
import { EmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  ListContainerFactory,
} from '@kbn/embeddable-examples-plugin/public';

interface Props {
  listContainerEmbeddableFactory: ListContainerFactory;
}

export function ListContainerExample({ listContainerEmbeddableFactory }: Props) {
  return (
    <>
      <EuiPageTemplate.Header pageTitle="Groups of embeddables" />
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiText>Use container embeddable to render a group of embeddables.</EuiText>
          <EuiSpacer />
          <EuiPanel data-test-subj="listContainerEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableRenderer
              factory={listContainerEmbeddableFactory}
              input={{
                id: 'hello',
                title: 'Hello world list',
                viewMode: ViewMode.VIEW,
                panels: {
                  '1': {
                    type: HELLO_WORLD_EMBEDDABLE,
                    explicitInput: {
                      id: '1',
                    },
                  },
                  '2': {
                    type: HELLO_WORLD_EMBEDDABLE,
                    explicitInput: {
                      id: '2',
                    },
                  },
                },
              }}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<EmbeddableRenderer
  factory={listContainerEmbeddableFactory}
  input={{
    id: 'hello',
    title: 'Todo list',
    viewMode: ViewMode.VIEW,
    panels: {
      '1': {
        type: HELLO_WORLD_EMBEDDABLE,
        explicitInput: {
          id: '1',
        },
      '2': {
          type: HELLO_WORLD_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
       }
    },
  }}
/>`}
          </EuiCodeBlock>
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
