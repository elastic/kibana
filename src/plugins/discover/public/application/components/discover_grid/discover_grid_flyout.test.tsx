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
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';

describe('Discover flyout', function () {
  setDocViewsRegistry(new DocViewsRegistry());

  it('should be rendered correctly using an index pattern without timefield', async () => {
    const onClose = jest.fn();
    const component = mountWithIntl(
      <DiscoverGridFlyout
        columns={['date']}
        indexPattern={indexPatternMock}
        hit={esHits[0]}
        onAddColumn={jest.fn()}
        onClose={onClose}
        onFilter={jest.fn()}
        onRemoveColumn={jest.fn()}
        services={({ filterManager: createFilterManagerMock() } as unknown) as DiscoverServices}
      />
    );

    const url = findTestSubject(component, 'docTableRowAction').prop('href');
    expect(url).toMatchInlineSnapshot(`"#/doc/the-index-pattern-id/i?id=1"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(onClose).toHaveBeenCalled();
  });

  it('should be rendered correctly using an index pattern with timefield', async () => {
    const onClose = jest.fn();
    const component = mountWithIntl(
      <DiscoverGridFlyout
        columns={['date']}
        indexPattern={indexPatternWithTimefieldMock}
        hit={esHits[0]}
        onAddColumn={jest.fn()}
        onClose={onClose}
        onFilter={jest.fn()}
        onRemoveColumn={jest.fn()}
        services={({ filterManager: createFilterManagerMock() } as unknown) as DiscoverServices}
      />
    );

    const actions = findTestSubject(component, 'docTableRowAction');
    expect(actions.length).toBe(2);
    expect(actions.first().prop('href')).toMatchInlineSnapshot(
      `"#/doc/index-pattern-with-timefield-id/i?id=1"`
    );
    expect(actions.last().prop('href')).toMatchInlineSnapshot(
      `"#/context/index-pattern-with-timefield-id/1?_g=(filters:!())&_a=(columns:!(date),filters:!())"`
    );
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(onClose).toHaveBeenCalled();
  });
});
