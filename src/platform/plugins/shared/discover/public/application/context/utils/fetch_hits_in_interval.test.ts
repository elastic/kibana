/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { SortDirection } from '@kbn/data-plugin/public';
import { createSearchSourceStub } from '../services/_stubs';
import { SurrDocType } from '../services/context';
import { discoverServiceMock } from '../../../__mocks__/services';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../context_awareness';
import { fetchHitsInInterval } from './fetch_hits_in_interval';

describe('fetchHitsInInterval', () => {
  const { uiSettings } = coreMock.createStart();
  // `x` formats as milliseconds since the Unix epoch, which doesn't depend on the timezone
  uiSettings.get.mockReturnValue('x');

  const fetchRequestTitle = async (type: SurrDocType): Promise<string> => {
    const searchSource = createSearchSourceStub([], '@timestamp');

    await fetchHitsInInterval(
      searchSource,
      '@timestamp',
      [{ '@timestamp': SortDirection.desc }, { _doc: SortDirection.desc }],
      SortDirection.desc,
      [1000, null],
      [],
      5,
      '',
      '1',
      type,
      { ...discoverServiceMock, uiSettings },
      discoverServiceMock.profilesManager.createScopedProfilesManager({
        scopedEbtManager: discoverServiceMock.ebtManager.createScopedEBTManager(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      })
    );

    return searchSource.fetch$.firstCall.args[0].inspector.title;
  };

  it('names the request of older documents after the time they are looked up before', async () => {
    expect(await fetchRequestTitle(SurrDocType.SUCCESSORS)).toBe('Older documents (before 1000)');
  });

  it('names the request of newer documents after the time they are looked up after', async () => {
    expect(await fetchRequestTitle(SurrDocType.PREDECESSORS)).toBe('Newer documents (after 1000)');
  });
});
