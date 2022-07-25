/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPanel,
  EuiText,
  EuiTitle,
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
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Hello world example</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            Here the embeddable is rendered without the factory. A developer may use this method if
            they want to statically embed a single embeddable into their application or page. Also
            `input` prop may be used to declaratively update current embeddable input
          </EuiText>
          <EuiPanel data-test-subj="helloWorldEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableRenderer embeddable={new HelloWorldEmbeddable({ id: 'hello' })} />
          </EuiPanel>

          <EuiText>
            Here the embeddable is rendered using the factory. Internally it creates embeddable
            using factory.create(). This method is used programatically when a container embeddable
            attempts to initialize it&#39;s children embeddables. This method can be used when you
            only have a access to a factory.
          </EuiText>
          <EuiPanel
            data-test-subj="helloWorldEmbeddableFromFactory"
            paddingSize="none"
            role="figure"
          >
            <EmbeddableRenderer factory={helloWorldEmbeddableFactory} input={{ id: '1234' }} />
          </EuiPanel>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
