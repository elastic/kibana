/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DocViewerLegacyTable } from './table';
import { DataView } from '@kbn/data-views-plugin/public';
import { DocViewRenderProps } from '../../../doc_views_types';
import { ElasticSearchHit } from '../../../../../types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../../../../../build_services';

const services = {
  uiSettings: {
    get: (key: string) => {
      if (key === 'discover:showMultiFields') {
        return true;
      }
    },
  },
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
  },
};

const indexPattern = {
  fields: {
    getAll: () => [
      {
        name: '_index',
        type: 'string',
        scripted: false,
        filterable: true,
      },
      {
        name: 'message',
        type: 'string',
        scripted: false,
        filterable: false,
      },
      {
        name: 'extension',
        type: 'string',
        scripted: false,
        filterable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        scripted: false,
        filterable: true,
      },
      {
        name: 'scripted',
        type: 'number',
        scripted: true,
        filterable: false,
      },
    ],
  },
  metaFields: ['_index', '_score'],
  getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
} as unknown as DataView;

indexPattern.fields.getByName = (name: string) => {
  return indexPattern.fields.getAll().find((field) => field.name === name);
};

const mountComponent = (props: DocViewRenderProps, overrides?: Partial<DiscoverServices>) => {
  return mountWithIntl(
    <KibanaContextProvider services={{ ...services, ...overrides }}>
      <DocViewerLegacyTable {...props} />{' '}
    </KibanaContextProvider>
  );
};

describe('DocViewTable at Discover', () => {
  // At Discover's main view, all buttons are rendered
  // check for existence of action buttons and warnings

  const hit = {
    _index: 'logstash-2014.09.09',
    _type: 'doc',
    _id: 'id123',
    _score: 1,
    _source: {
      message:
        'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. \
        Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus \
        et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, \
        ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. \
        Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, \
        rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. \
        Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. \
        Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut',
      extension: 'html',
      not_mapped: 'yes',
      bytes: 100,
      objectArray: [{ foo: true }],
      relatedContent: {
        test: 1,
      },
      scripted: 123,
      _underscore: 123,
    },
  } as ElasticSearchHit;

  const props = {
    hit,
    columns: ['extension'],
    indexPattern,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };
  const component = mountComponent(props);
  [
    {
      _property: '_index',
      addInclusiveFilterButton: true,
      collapseBtn: false,
      noMappingWarning: false,
      toggleColumnButton: true,
      underscoreWarning: false,
    },
    {
      _property: 'message',
      addInclusiveFilterButton: false,
      collapseBtn: true,
      noMappingWarning: false,
      toggleColumnButton: true,
      underscoreWarning: false,
    },
    {
      _property: '_underscore',
      addInclusiveFilterButton: false,
      collapseBtn: false,
      noMappingWarning: false,
      toggleColumnButton: true,
      underScoreWarning: true,
    },
    {
      _property: 'scripted',
      addInclusiveFilterButton: false,
      collapseBtn: false,
      noMappingWarning: false,
      toggleColumnButton: true,
      underScoreWarning: false,
    },
    {
      _property: 'not_mapped',
      addInclusiveFilterButton: false,
      collapseBtn: false,
      noMappingWarning: true,
      toggleColumnButton: true,
      underScoreWarning: false,
    },
  ].forEach((check) => {
    const rowComponent = findTestSubject(component, `tableDocViewRow-${check._property}`);

    it(`renders row for ${check._property}`, () => {
      expect(rowComponent.length).toBe(1);
    });

    (
      [
        'addInclusiveFilterButton',
        'collapseBtn',
        'toggleColumnButton',
        'underscoreWarning',
      ] as const
    ).forEach((element) => {
      const elementExist = check[element];

      if (typeof elementExist === 'boolean') {
        const btn = findTestSubject(rowComponent, element, '^=');

        it(`renders ${element} for '${check._property}' correctly`, () => {
          const disabled = btn.length ? btn.props().disabled : true;
          const clickAble = btn.length && !disabled ? true : false;
          expect(clickAble).toBe(elementExist);
        });
      }
    });
  });
});

describe('DocViewTable at Discover Context', () => {
  // here no toggleColumnButtons  are rendered
  const hit = {
    _index: 'logstash-2014.09.09',
    _type: 'doc',
    _id: 'id123',
    _score: 1,
    _source: {
      message:
        'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. \
        Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus \
        et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, \
        ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. \
        Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, \
        rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. \
        Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. \
        Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut',
    },
  } as ElasticSearchHit;
  const props = {
    hit,
    columns: ['extension'],
    indexPattern,
    filter: jest.fn(),
  };

  const component = mountComponent(props);

  it(`renders no toggleColumnButton`, () => {
    const foundLength = findTestSubject(component, 'toggleColumnButtons').length;
    expect(foundLength).toBe(0);
  });

  it(`renders addInclusiveFilterButton`, () => {
    const row = findTestSubject(component, `tableDocViewRow-_index`);
    const btn = findTestSubject(row, 'addInclusiveFilterButton');
    expect(btn.length).toBe(1);
    btn.simulate('click');
    expect(props.filter).toBeCalled();
  });

  it(`renders functional collapse button`, () => {
    const btn = findTestSubject(component, `collapseBtn`);
    const html = component.html();

    expect(component.html()).toContain('dscTruncateByHeight');

    expect(btn.length).toBe(1);
    btn.simulate('click');
    expect(component.html() !== html).toBeTruthy();
  });
});

describe('DocViewTable at Discover Doc', () => {
  const hit = {
    _index: 'logstash-2014.09.09',
    _score: 1,
    _type: 'doc',
    _id: 'id123',
    _source: {
      extension: 'html',
      not_mapped: 'yes',
    },
  };
  // here no action buttons are rendered
  const props = {
    hit,
    indexPattern,
  };
  const component = mountComponent(props);
  const foundLength = findTestSubject(component, 'addInclusiveFilterButton').length;

  it(`renders no action buttons`, () => {
    expect(foundLength).toBe(0);
  });
});

describe('DocViewTable at Discover Doc with Fields API', () => {
  const indexPatterneCommerce = {
    fields: {
      getAll: () => [
        {
          name: '_index',
          type: 'string',
          scripted: false,
          filterable: true,
        },
        {
          name: 'category',
          type: 'string',
          scripted: false,
          filterable: true,
        },
        {
          name: 'category.keyword',
          displayName: 'category.keyword',
          type: 'string',
          scripted: false,
          filterable: true,
          spec: {
            subType: {
              multi: {
                parent: 'category',
              },
            },
          },
        },
        {
          name: 'customer_first_name',
          type: 'string',
          scripted: false,
          filterable: true,
        },
        {
          name: 'customer_first_name.keyword',
          displayName: 'customer_first_name.keyword',
          type: 'string',
          scripted: false,
          filterable: false,
          spec: {
            subType: {
              multi: {
                parent: 'customer_first_name',
              },
            },
          },
        },
        {
          name: 'customer_first_name.nickname',
          displayName: 'customer_first_name.nickname',
          type: 'string',
          scripted: false,
          filterable: false,
          spec: {
            subType: {
              multi: {
                parent: 'customer_first_name',
              },
            },
          },
        },
        {
          name: 'city',
          displayName: 'city',
          type: 'keyword',
          isMapped: true,
          readFromDocValues: true,
          searchable: true,
          shortDotsEnable: false,
          scripted: false,
          filterable: false,
        },
        {
          name: 'city.raw',
          displayName: 'city.raw',
          type: 'string',
          isMapped: true,
          spec: {
            subType: {
              multi: {
                parent: 'city',
              },
            },
          },
          shortDotsEnable: false,
          scripted: false,
          filterable: false,
        },
      ],
    },
    metaFields: ['_index', '_type', '_score', '_id'],
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
  } as unknown as DataView;

  indexPatterneCommerce.fields.getByName = (name: string) => {
    return indexPatterneCommerce.fields.getAll().find((field) => field.name === name);
  };

  const fieldsHit = {
    _index: 'logstash-2014.09.09',
    _type: 'doc',
    _id: 'id123',
    _score: 1.0,
    fields: {
      category: "Women's Clothing",
      'category.keyword': "Women's Clothing",
      customer_first_name: 'Betty',
      'customer_first_name.keyword': 'Betty',
      'customer_first_name.nickname': 'Betsy',
      'city.raw': 'Los Angeles',
    },
  };
  const props = {
    hit: fieldsHit,
    columns: ['Document'],
    indexPattern: indexPatterneCommerce,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };

  it('renders multifield rows if showMultiFields flag is set', () => {
    const component = mountComponent(props);

    const categoryKeywordRow = findTestSubject(component, 'tableDocViewRow-category.keyword');
    expect(categoryKeywordRow.length).toBe(1);

    expect(findTestSubject(component, 'tableDocViewRow-customer_first_name.keyword').length).toBe(
      1
    );
    expect(findTestSubject(component, 'tableDocViewRow-customer_first_name.nickname').length).toBe(
      1
    );

    expect(
      findTestSubject(component, 'tableDocViewRow-category.keyword-multifieldBadge').length
    ).toBe(1);

    expect(
      findTestSubject(component, 'tableDocViewRow-customer_first_name.keyword-multifieldBadge')
        .length
    ).toBe(1);

    expect(
      findTestSubject(component, 'tableDocViewRow-customer_first_name.nickname-multifieldBadge')
        .length
    ).toBe(1);

    expect(findTestSubject(component, 'tableDocViewRow-city.raw').length).toBe(1);
  });

  it('does not render multifield rows if showMultiFields flag is not set', () => {
    const overridedServices = {
      uiSettings: {
        get: (key: string) => {
          if (key === 'discover:showMultiFields') {
            return false;
          }
        },
      },
    } as unknown as DiscoverServices;
    const component = mountComponent(props, overridedServices);

    const categoryKeywordRow = findTestSubject(component, 'tableDocViewRow-category.keyword');
    expect(categoryKeywordRow.length).toBe(0);

    expect(findTestSubject(component, 'tableDocViewRow-customer_first_name.keyword').length).toBe(
      0
    );

    expect(findTestSubject(component, 'tableDocViewRow-customer_first_name.nickname').length).toBe(
      0
    );

    expect(
      findTestSubject(component, 'tableDocViewRow-customer_first_name.keyword-multifieldBadge')
        .length
    ).toBe(0);

    expect(findTestSubject(component, 'tableDocViewRow-customer_first_name').length).toBe(1);
    expect(
      findTestSubject(component, 'tableDocViewRow-customer_first_name.nickname-multifieldBadge')
        .length
    ).toBe(0);

    expect(findTestSubject(component, 'tableDocViewRow-city').length).toBe(0);
    expect(findTestSubject(component, 'tableDocViewRow-city.raw').length).toBe(1);
  });
});
