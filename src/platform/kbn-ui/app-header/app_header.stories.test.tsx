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
import * as editableTitleStories from './src/title_area/title_area.stories';
import * as appBadgeStories from './app_badge.stories';
import * as appHeaderDescriptionStories from './app_header_description.stories';
import * as appHeaderMetadataStories from './app_header_metadata.stories';

describe('app header stories', () => {
  const suites = {
    'App Header': composeStories(appHeaderStories),
    'App Header Editable Title': composeStories(editableTitleStories),
    'App Badge': composeStories(appBadgeStories),
    'App Header Description': composeStories(appHeaderDescriptionStories),
    'App Header Metadata': composeStories(appHeaderMetadataStories),
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
