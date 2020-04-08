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
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { EuiPageContent } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiSelect } from '@elastic/eui';
import { AppMountParameters } from 'kibana/public';

import { EuiButton } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { Services } from './services';

function EnhancementsPatternApp(props: Services) {
  const [name, setName] = useState('');
  const [greeterId, setGreeterId] = useState('Casual');
  return (
    <EuiPageContent>
      <EuiText>
        <h1>Enhancements pattern</h1>
        This explorer shows how one plugin can add enhancements via a{' '}
        <EuiCode>setCustomProvider</EuiCode> pattern. If you run kibana with{' '}
        <EuiCode>syarn start --run-examples</EuiCode> and click the Greet me button, you should see
        a modal. This is the enhanced functionality. If you set{' '}
        <EuiCode>greetingEnhanced.enabled: false</EuiCode> in your kibana.yml and then run this
        example again you should only see a simple alert window, the unenhanced version.
      </EuiText>
      <EuiSpacer />
      <EuiSelect
        value={greeterId}
        onChange={e => setGreeterId(e.target.value)}
        options={props.getGreeterIds().map(id => ({
          value: id,
          text: id,
        }))}
      />
      <EuiFieldText
        placeholder="What is your name?"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <EuiButton
        disabled={greeterId === '' || name === ''}
        onClick={() => props.greetWithGreeter(greeterId, name)}
      >
        Greet me
      </EuiButton>
    </EuiPageContent>
  );
}

export const renderApp = (services: Services, element: AppMountParameters['element']) => {
  ReactDOM.render(<EnhancementsPatternApp {...services} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
