/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { AppMountParameters } from '@kbn/core/public';
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
