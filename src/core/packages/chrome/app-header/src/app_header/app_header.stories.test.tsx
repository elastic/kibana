/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as appHeaderStories from './app_header.stories';
import * as editableTitleStories from './title_area/title_area.stories';
import * as appBadgeStories from './app_badge.stories';
import * as appHeaderMetadataStories from './app_header_metadata.stories';

// Smoke test: render every story through `composeStories`. The stories provide the real
// Storybook chrome mock (`createChromeStorybookStart`), so if a header component starts
// depending on a chrome member the mock doesn't implement, this fails in CI instead of
// silently breaking Storybook at runtime (e.g. a missing `chrome.next.getFeedbackHandler$`).
describe('app header stories', () => {
  const suites = {
    'Chrome/App Header': composeStories(appHeaderStories),
    'Chrome/App Header Editable Title': composeStories(editableTitleStories),
    'Chrome/App Badge': composeStories(appBadgeStories),
    'Chrome/App Header Metadata': composeStories(appHeaderMetadataStories),
  };

  for (const [group, stories] of Object.entries(suites)) {
    describe(group, () => {
      for (const [name, Story] of Object.entries(stories)) {
        it(`renders "${name}"`, () => {
          render(<Story />);
        });
      }
    });
  }
});
