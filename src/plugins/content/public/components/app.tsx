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

import type { ContentRegistry } from '../service/registry/content_registry';
import type { ContentCache } from '../service/cache/content_cache';

interface ContentAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  registry: ContentRegistry;
  cache: ContentCache;
}

export const ContentApp = ({ registry, cache }: ContentAppDeps) => {

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
                <EuiButton type="primary" size="s" onClick={async () => {
                  const item = cache.get('dashboard:edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b');
                  const data = await item.getData();
                  console.log('data', data);
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
