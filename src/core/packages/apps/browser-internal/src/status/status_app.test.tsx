/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { StatusApp } from './status_app';

const flushPromises = async () => {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
};

describe('StatusApp', () => {
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createSetupContract>;
  let docLinks: ReturnType<typeof docLinksServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    notifications = notificationServiceMock.createSetupContract();
    docLinks = docLinksServiceMock.createStartContract();
  });

  it('renders the redacted prompt with overall status and hides detailed sections when status.core and status.plugins are missing', async () => {
    http.get.mockResolvedValue({ status: { overall: { level: 'available' } } } as any);

    const wrapper = mountWithIntl(
      <StatusApp
        http={http as unknown as InternalHttpSetup}
        notifications={notifications}
        getDocLinks={() => docLinks}
      />
    );

    await flushPromises();
    wrapper.update();

    expect(wrapper.find('[data-test-subj="statusPageRedactedPrompt"]').exists()).toBe(true);
    expect(wrapper.find('ServerStatus').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="serverStatusTitle"]').exists()).toBe(true);
    expect(wrapper.find('VersionHeader').exists()).toBe(false);
    expect(wrapper.find('MetricTiles').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="statusPageRedactedPromptLearnMoreLink"]').exists()).toBe(
      true
    );
  });

  it('omits the Learn more link when docLinks is unavailable', async () => {
    http.get.mockResolvedValue({ status: { overall: { level: 'available' } } } as any);

    const wrapper = mountWithIntl(
      <StatusApp
        http={http as unknown as InternalHttpSetup}
        notifications={notifications}
        getDocLinks={() => undefined}
      />
    );

    await flushPromises();
    wrapper.update();

    expect(wrapper.find('[data-test-subj="statusPageRedactedPrompt"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="statusPageRedactedPromptLearnMoreLink"]').exists()).toBe(
      false
    );
  });
});
