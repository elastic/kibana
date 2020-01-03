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

import React from 'react';
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
import {
  GetEmbeddableFactory,
  EmbeddableFactoryRenderer,
  EmbeddableRoot,
} from '../../../src/plugins/embeddable/public';
import { HelloWorldEmbeddable, HELLO_WORLD_EMBEDDABLE } from '../../embeddable_examples/public';

interface Props {
  getEmbeddableFactory: GetEmbeddableFactory;
}

export function HelloWorldEmbeddableExample({ getEmbeddableFactory }: Props) {
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
            they want to statically embed a single embeddable into their application or page.
          </EuiText>
          <EuiPanel data-test-subj="helloWorldEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableRoot embeddable={new HelloWorldEmbeddable({ id: 'hello' })} />
          </EuiPanel>

          <EuiText>
            Here the embeddable is rendered using the factory.create method. This method is used
            programatically when a container embeddable attempts to initialize it&#39;s children
            embeddables. This method can be used when you only have a string representing the type
            of embeddable, and input data.
          </EuiText>
          <EuiPanel
            data-test-subj="helloWorldEmbeddableFromFactory"
            paddingSize="none"
            role="figure"
          >
            <EmbeddableFactoryRenderer
              getEmbeddableFactory={getEmbeddableFactory}
              type={HELLO_WORLD_EMBEDDABLE}
              input={{ id: '1234' }}
            />
          </EuiPanel>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
