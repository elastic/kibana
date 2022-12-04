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
import {firstValueFrom} from 'rxjs';
import {ContentCard} from './items/card/card';
import {context} from './context';

interface ContentAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  registry: ContentRegistry;
  cache: ContentCache;
}

export const ContentApp = ({ registry, cache }: ContentAppDeps) => {

  return (
    <context.Provider value={{registry, cache}}>
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
                    // const item = cache.get('dashboard:edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b');
                    // const data = await item.getData();
                    // console.log('data', data);
                    // const type = registry.getType('dashboard')!;
                    // const list = await type.list();
                    // console.log(type, list);
                    const list = await firstValueFrom(cache.type('dashboard').list());
                    console.log('list', list);
                  }}>
                    Do something...
                  </EuiButton>
                </EuiText>

                <ContentCard id={'dashboard:edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b'} />
              </div>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </context.Provider>
  );
};
