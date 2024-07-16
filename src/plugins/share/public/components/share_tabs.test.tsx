/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ShareMenuTabs } from './share_tabs';
import { ShareTabsContext } from './context';
import { mountWithIntl } from '@kbn/test-jest-helpers';

const mockShareContext = {
  allowEmbed: true,
  allowShortUrl: true,
  anonymousAccess: { getCapabilities: jest.fn() },
  urlService: {},
  isEmbedded: true,
  theme: {},
  objectTypeMeta: { title: 'title' },
};

describe('Share modal tabs', () => {
  it('should render export tab when there are share menu items that are not disabled', async () => {
    const testItem = [{ shareMenuItem: { disabled: false } }];
    const wrapper = await mountWithIntl(
      <ShareTabsContext.Provider value={{ ...mockShareContext, shareMenuItems: testItem }}>
        <ShareMenuTabs />
      </ShareTabsContext.Provider>
    );
    expect(wrapper.find('[data-test-subj="export"]').exists()).toBeTruthy();
  });
  it('should not render export tab when the license is disabled', async () => {
    const testItems = [{ shareMenuItem: { disabled: true } }];
    const wrapper = await mountWithIntl(
      <ShareTabsContext.Provider value={{ ...mockShareContext, shareMenuItems: testItems }}>
        <ShareMenuTabs />
      </ShareTabsContext.Provider>
    );
    expect(wrapper.find('[data-test-subj="export"]').exists()).toBeFalsy();
  });
});
