/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getGeneralFilters } from '.';

describe('getGeneralFilters', () => {
  test('it returns empty string if no filters', () => {
    const filters = getGeneralFilters({}, ['exception-list']);

    expect(filters).toEqual('');
  });

  test('it properly formats filters when one namespace type passed in', () => {
    const filters = getGeneralFilters({ created_by: 'moi', name: 'Sample' }, ['exception-list']);

    expect(filters).toEqual(
      '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample)'
    );
  });

  test('it properly formats filters when two namespace types passed in', () => {
    const filters = getGeneralFilters({ created_by: 'moi', name: 'Sample' }, [
      'exception-list',
      'exception-list-agnostic',
    ]);

    expect(filters).toEqual(
      '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample)'
    );
  });

  test('it properly formats filters when two types are passed in', () => {
    const filters = getGeneralFilters(
      {
        created_by: 'moi',
        name: 'Sample',
        types: [ExceptionListTypeEnum.DETECTION, ExceptionListTypeEnum.RULE_DEFAULT],
      },
      ['exception-list', 'exception-list-agnostic']
    );

    expect(filters).toEqual(
      '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name.text:Sample OR exception-list-agnostic.attributes.name.text:Sample) AND (exception-list.attributes.type:detection OR exception-list.attributes.type:rule_default OR exception-list-agnostic.attributes.type:detection OR exception-list-agnostic.attributes.type:rule_default)'
    );
  });
});
