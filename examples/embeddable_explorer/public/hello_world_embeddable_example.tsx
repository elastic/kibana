/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiPageTemplate,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactory,
} from '@kbn/embeddable-examples-plugin/public';

interface Props {
  helloWorldEmbeddableFactory: HelloWorldEmbeddableFactory;
}

export function HelloWorldEmbeddableExample({ helloWorldEmbeddableFactory }: Props) {
  return (
    <>
      <EuiPageTemplate.Header pageTitle="Render embeddable" />
      <EuiPageTemplate.Section grow={false} bottomBorder="extended">
        <>
          <EuiTitle size="xs">
            <h2>Embeddable prop</h2>
          </EuiTitle>
          <EuiText>
            Use embeddable constructor to pass embeddable directly to{' '}
            <strong>EmbeddableRenderer</strong>. Use <strong>input</strong> prop to declaratively
            update embeddable input.
          </EuiText>
          <EuiSpacer />
          <EuiPanel data-test-subj="helloWorldEmbeddablePanel" role="figure">
            <EmbeddableRenderer embeddable={new HelloWorldEmbeddable({ id: 'hello' })} />
          </EuiPanel>
          <EuiSpacer />
          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<EmbeddableRenderer embeddable={new HelloWorldEmbeddable({ id: 'hello' })} />`}
          </EuiCodeBlock>
        </>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiTitle size="xs">
            <h2>Factory prop</h2>
          </EuiTitle>
          <EuiText>
            Use <strong>factory</strong> prop to programatically instantiate embeddable.
          </EuiText>
          <EuiSpacer />
          <EuiPanel data-test-subj="helloWorldEmbeddableFromFactory" role="figure">
            <EmbeddableRenderer factory={helloWorldEmbeddableFactory} input={{ id: '1234' }} />
          </EuiPanel>
          <EuiSpacer />
          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {`<EmbeddableRenderer factory={helloWorldEmbeddableFactory} input={{ id: '1234' }} />`}
          </EuiCodeBlock>
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
