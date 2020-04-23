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
import { EuiPageContent, EuiImage, EuiSpacer, EuiText } from '@elastic/eui';
import { EuiPageContentHeader } from '@elastic/eui';
import { BIRTHDAY } from './types';

export function GreetingCardViewer() {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const message = params.get('message');
  const to = params.get('to');
  const from = params.get('from');
  const type = params.get('type');
  const imgType = type === BIRTHDAY ? 'birthday' : 'nurse';
  const greetingText = type === BIRTHDAY ? 'Happy birthday!' : 'Get well soon!';

  return (
    <EuiPageContent>
      <EuiPageContentHeader>{greetingText}</EuiPageContentHeader>
      <EuiText>{`Dear ${to},`}</EuiText>
      <EuiImage
        size="m"
        alt={greetingText}
        hasShadow
        url={`https://source.unsplash.com/2000x1000/?${imgType}`}
      />
      <blockquote>{message}</blockquote>
      <EuiSpacer />
      <EuiText>{`- ${from}`}</EuiText>
    </EuiPageContent>
  );
}
