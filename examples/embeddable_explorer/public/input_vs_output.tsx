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
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EmbeddableStart, IEmbeddable } from '../../../src/plugins/embeddable/public';
import { HELLO_WORLD_EMBEDDABLE } from '../../embeddable_examples/public';

interface Props {
  embeddableServices: EmbeddableStart;
}

export function InputVsOutputExample({ embeddableServices }: Props) {
  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    if (!embeddable) {
      const factory = embeddableServices.getEmbeddableFactory(HELLO_WORLD_EMBEDDABLE);
      const promise = factory?.create({ id: 'hello', customPanelTitle: 'Hi there!' });
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
            <h1>Embeddable input vs output</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            One example of input and output state is an embeddable&apos;s title. The Customize Panel
            action works on any embeddable in an <EuiCode>EmbeddablePanel</EuiCode> that takes
            <EuiCode>title</EuiCode> as input or has title on output.
            <EuiSpacer />
            <EuiCallOut>
              <b>Input</b> is state <i> given to</i> the embeddable. <b>Output</b> is state read{' '}
              <i>from</i> the embeddable. <EuiCode>embeddable.updateInput</EuiCode> is a public
              function while
              <EuiCode>embeddable.updateOutput</EuiCode> is private.
            </EuiCallOut>
            <EuiSpacer />
            If <EuiCode>input.title</EuiCode> exists, this is used in the display, as it&apos;s
            considered an override. Every embeddable that wants the &quot;Reset panel title&quot;
            action to work should store the initial <EuiCode>input.title</EuiCode> on output, or
            some other default title (for example, the title stored with a saved object).
          </EuiText>
          <EuiText>
            To explore this example:
            <ul>
              <li>
                Try editing the panel title using the <b>Customize panel title</b> action which is
                available only in Edit mode.
              </li>
              <li>
                Play around with resetting and hiding the panel title. Hide the panel title and view
                the embeddable in view mode to see how the panel header space is gone.
              </li>
            </ul>
          </EuiText>

          <EuiSpacer />
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
