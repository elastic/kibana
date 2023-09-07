/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText, EuiPageTemplate } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { IEmbeddable, EmbeddablePanel } from '@kbn/embeddable-plugin/public';
import { HelloWorldEmbeddableFactory } from '@kbn/embeddable-examples-plugin/public';

interface Props {
  helloWorldFactory: HelloWorldEmbeddableFactory;
}

export function EmbeddablePanelExample({ helloWorldFactory }: Props) {
  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    if (!embeddable) {
      const promise = helloWorldFactory.create({ id: '1', title: 'Hello World!' });
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
    <>
      <EuiPageTemplate.Header pageTitle="Context menu" />
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiText>
            You can render your embeddable inside the EmbeddablePanel component. This adds some
            extra rendering and offers a context menu with pluggable actions. Using EmbeddablePanel
            to render your embeddable means you get access to the &quot;Add panel flyout&quot;. Now
            you can see how to add embeddables to your container, and how
            &quot;getExplicitInput&quot; is used to grab input not provided by the container.
          </EuiText>
          <EuiPanel data-test-subj="embeddedPanelExample" paddingSize="none" role="figure">
            {embeddable ? (
              <EmbeddablePanel embeddable={embeddable} />
            ) : (
              <EuiText>Loading...</EuiText>
            )}
          </EuiPanel>

          <EuiSpacer />
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
