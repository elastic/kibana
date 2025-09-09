/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useService } from '@kbn/core-di-browser';
import {
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiProvider,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { EchoService } from './service';

export function App() {
  const service = useService(EchoService);
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    (async () => {
      setOutput(await service.echo(input));
    })();
  }, [service, input]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  return (
    <EuiProvider>
      <EuiPage>
        <EuiPageBody css={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>Dependency Injection Demo</h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageSection>
            <EuiTextArea
              placeholder="Message"
              fullWidth
              onChange={handleChange}
              data-test-subj="input"
            />
            <EuiHorizontalRule />
            <EuiText data-test-subj="output">{output}</EuiText>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
}
