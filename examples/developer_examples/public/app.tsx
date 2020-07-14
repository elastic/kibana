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

import {
  EuiText,
  EuiPageContent,
  EuiCard,
  EuiPageContentHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiListGroup,
  EuiHighlight,
  EuiLink,
  EuiButtonIcon,
} from '@elastic/eui';
import { AppMountParameters } from '../../../src/core/public';
import { ExampleDefinition } from './types';

interface Props {
  examples: ExampleDefinition[];
  navigateToApp: (appId: string) => void;
  getUrlForApp: (appId: string) => string;
}

function DeveloperExamples({ examples, navigateToApp, getUrlForApp }: Props) {
  const [search, setSearch] = useState<string>('');

  const lcSearch = search.toLowerCase();
  const filteredExamples = !lcSearch
    ? examples
    : examples.filter((def) => {
        if (def.description.toLowerCase().indexOf(lcSearch) >= 0) return true;
        if (def.title.toLowerCase().indexOf(lcSearch) >= 0) return true;
        return false;
      });

  return (
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiText>
          <h1>Developer examples</h1>
          <p>
            The following examples showcase services and APIs that are available to developers.
            <EuiFieldSearch
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isClearable={true}
              aria-label="Search developer examples"
            />
          </p>
        </EuiText>
      </EuiPageContentHeader>
      <EuiFlexGroup wrap>
        {filteredExamples.map((def) => (
          <EuiFlexItem style={{ minWidth: 300, maxWidth: 500 }} key={def.appId}>
            <EuiCard
              description={
                <EuiHighlight search={search} highlightAll={true}>
                  {def.description}
                </EuiHighlight>
              }
              title={
                <React.Fragment>
                  <EuiLink
                    onClick={() => {
                      navigateToApp(def.appId);
                    }}
                  >
                    <EuiHighlight search={search} highlightAll={true}>
                      {def.title}
                    </EuiHighlight>
                  </EuiLink>
                  <EuiButtonIcon
                    iconType="popout"
                    onClick={() =>
                      window.open(getUrlForApp(def.appId), '_blank', 'noopener, noreferrer')
                    }
                  >
                    Open in new tab
                  </EuiButtonIcon>
                </React.Fragment>
              }
              image={def.image}
              footer={def.links ? <EuiListGroup size={'s'} listItems={def.links} /> : undefined}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPageContent>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<DeveloperExamples {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
