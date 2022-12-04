import React from 'react';

import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '../../../../core/public';

import { ContentRegistry } from '../service/registry/content_registry';

interface ContentAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  registry: ContentRegistry;
}

export const ContentApp = ({ registry }: ContentAppDeps) => {

  return (
    <EuiPage restrictWidth="1000px">
      <EuiPageBody>
        <EuiPageHeader>
          <br />
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <div style={{width: 1000}}>
              <EuiText>
                <EuiButton type="primary" size="s" onClick={() => {
                  console.log(registry);
                }}>
                  Do something...
                </EuiButton>
              </EuiText>
            </div>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
