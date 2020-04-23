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
import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSuperSelect,
  EuiSpacer,
} from '@elastic/eui';
import { Link } from 'react-router-dom';
import { GET_WELL, BIRTHDAY } from './types';

export function GreetingCardCreator() {
  const [message, setMessage] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [type, setType] = useState<string>(BIRTHDAY);

  return (
    <EuiPageContent>
      <EuiPageContentHeader>Create and send a greeting card.</EuiPageContentHeader>
      <EuiForm>
        <EuiFormRow label="To">
          <EuiFieldText name="to" value={to} onChange={e => setTo(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="Message">
          <EuiFieldText name="message" value={message} onChange={e => setMessage(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="From">
          <EuiFieldText name="from" value={from} onChange={e => setFrom(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="Select type of greeting card">
          <EuiSuperSelect
            onChange={e => setType(e)}
            valueOfSelected={type}
            options={[
              {
                value: BIRTHDAY,
                inputDisplay: 'Happy birthday',
              },
              {
                value: GET_WELL,
                inputDisplay: 'Get well soon',
              },
            ]}
          />
        </EuiFormRow>
        <EuiSpacer />
        <Link
          to={{
            pathname: '/view',
            search: `message=${message}&to=${to}&from=${from}&type=${type}`,
          }}
        >
          <EuiButton>View</EuiButton>
        </Link>{' '}
      </EuiForm>
    </EuiPageContent>
  );
}
