/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { esHits } from '../../../__mocks__/es_hits';
import { createFilterManagerMock } from '../../../../../data/public/query/filter_manager/filter_manager.mock';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { DiscoverServices } from '../../../build_services';
import { DocViewsRegistry } from '../../doc_views/doc_views_registry';
import { setDocViewsRegistry } from '../../../kibana_services';

describe('Discover flyout', function () {
  it('should be rendered', async () => {
    setDocViewsRegistry(new DocViewsRegistry());
    const component = mountWithIntl(
      <DiscoverGridFlyout
        columns={['date']}
        indexPattern={indexPatternMock}
        hit={esHits[0]}
        onAddColumn={jest.fn()}
        onClose={jest.fn()}
        onFilter={jest.fn()}
        onRemoveColumn={jest.fn()}
        services={({ filterManager: createFilterManagerMock() } as unknown) as DiscoverServices}
      />
    );

    const url = findTestSubject(component, 'docTableRowAction').prop('href');
    expect(url).toMatchInlineSnapshot(`"#/doc/the-index-pattern-id/i?id=1"`);
  });
});
