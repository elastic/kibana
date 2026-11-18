/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import { createDiscoverSessionApiBodyEntry } from './api_body_entry';
import { discoverSessionApiData } from './transforms/transform_discover_session.fixtures';

const entry = createDiscoverSessionApiBodyEntry();

// A stored fixture is what the PUT route stores after a GET.
const storedFromBody = (body: DiscoverSessionApiData) => {
  const { body: normalized } = entry.toApi(entry.toStored(entry.getSchema().parse(body)));
  return entry.toStored(normalized);
};

const [classicTab, esqlTab] = discoverSessionApiData.tabs;

describe('Discover session API body entry', () => {
  it('round-trips a session with a data view reference, an ES|QL tab and a tag', () => {
    const stored = storedFromBody({
      ...discoverSessionApiData,
      tags: ['web-tag'],
      tabs: [
        { ...classicTab, data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' } },
        esqlTab,
      ],
    } as DiscoverSessionApiData);

    expect(stored.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'index-pattern', id: 'logs-data-view' }),
        expect.objectContaining({ type: 'tag', id: 'web-tag' }),
      ])
    );
    expect(expectApiBodyEntryRoundTrip(entry, stored)).toEqual(
      expect.objectContaining({ title: 'all_props', tags: ['web-tag'] })
    );
  });

  it('gives an inline data view a new stored ID, as the PUT route does when it creates a session', () => {
    const stored = storedFromBody(discoverSessionApiData);
    const { body } = entry.toApi(stored);

    expect(entry.toApi(entry.toStored(body)).body).toEqual(body);
    expect(body.tabs[0].data_source).toEqual(
      expect.objectContaining({
        type: 'data_view_spec',
        index_pattern: 'logs*,-logstash*,filebeat-*',
      })
    );
  });

  it('reports content the GET drops, such as a malformed control group', () => {
    const { attributes, references } = storedFromBody(discoverSessionApiData);
    const [storedClassicTab, ...otherTabs] = attributes.tabs;

    const { warnings } = entry.toApi({
      attributes: {
        ...attributes,
        tabs: [
          {
            ...storedClassicTab,
            attributes: { ...storedClassicTab.attributes, controlGroupJson: 'not json' },
          },
          ...otherTabs,
        ],
      },
      references,
    });

    expect(warnings).toEqual([
      { message: expect.stringContaining(`Tab [${classicTab.id}] dropped [control_panels]`) },
    ]);
  });
});
