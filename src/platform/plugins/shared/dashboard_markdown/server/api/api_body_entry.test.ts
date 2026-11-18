/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import { markdownApiBodyEntry } from './api_body_entry';

describe('markdown API body entry', () => {
  it('round-trips a markdown item', () => {
    const attributes = {
      title: 'Read me',
      description: 'How to use this dashboard',
      content: '# Hello\n\nSee the [docs](https://www.elastic.co).',
      settings: { open_links_in_new_tab: false },
    };

    expect(
      expectApiBodyEntryRoundTrip(markdownApiBodyEntry, { attributes, references: [] })
    ).toEqual(attributes);
  });
});
