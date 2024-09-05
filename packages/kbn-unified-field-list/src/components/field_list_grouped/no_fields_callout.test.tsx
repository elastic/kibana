/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { NoFieldsCallout } from './no_fields_callout';

describe('UnifiedFieldList <NoFieldCallout />', () => {
  it('renders correctly for index with no fields', () => {
    const component = shallow(<NoFieldsCallout fieldsExistInIndex={false} />);
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "1qdt3rt",
            "next": undefined,
            "styles": "
                padding: 8px;
              ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsExist"
        size="s"
      >
        <p>
          No fields exist in this data view.
        </p>
      </EuiText>
    `);
  });
  it('renders correctly when empty with no filters/timerange reasons', () => {
    const component = shallow(<NoFieldsCallout fieldsExistInIndex={true} />);
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          There are no fields.
        </p>
      </EuiText>
    `);
  });
  it('renders correctly with passed defaultNoFieldsMessage', () => {
    const component = shallow(
      <NoFieldsCallout fieldsExistInIndex={true} defaultNoFieldsMessage="No empty fields" />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          No empty fields
        </p>
      </EuiText>
    `);
  });

  it('renders properly when affected by field filter', () => {
    const component = shallow(
      <NoFieldsCallout fieldsExistInIndex={true} isAffectedByFieldFilter={true} />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          No fields match the selected filters.
        </p>
        <strong>
          Try:
        </strong>
        <ul>
          <li>
            Using different field filters
          </li>
        </ul>
      </EuiText>
    `);
  });

  it('renders correctly when affected by global filters and timerange', () => {
    const component = shallow(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByTimerange={true}
        isAffectedByGlobalFilter={true}
        defaultNoFieldsMessage="There are no available fields that contain data."
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          There are no available fields that contain data.
        </p>
        <strong>
          Try:
        </strong>
        <ul>
          <li>
            Extending the time range
          </li>
          <li>
            Changing the global filters
          </li>
        </ul>
      </EuiText>
    `);
  });

  it('renders correctly when affected by global filters and field filters', () => {
    const component = shallow(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByTimerange={true}
        isAffectedByFieldFilter={true}
        defaultNoFieldsMessage="There are no available fields that contain data."
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          No fields match the selected filters.
        </p>
        <strong>
          Try:
        </strong>
        <ul>
          <li>
            Extending the time range
          </li>
          <li>
            Using different field filters
          </li>
        </ul>
      </EuiText>
    `);
  });

  it('renders correctly when affected by field filters, global filter and timerange', () => {
    const component = shallow(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByFieldFilter={true}
        isAffectedByTimerange={true}
        isAffectedByGlobalFilter={true}
        defaultNoFieldsMessage={`doesn't exist`}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiText
        color="subdued"
        css={
          Object {
            "map": undefined,
            "name": "wd14gj",
            "next": undefined,
            "styles": "
              padding: 8px;
            ",
            "toString": [Function],
          }
        }
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
      >
        <p>
          No fields match the selected filters.
        </p>
        <strong>
          Try:
        </strong>
        <ul>
          <li>
            Extending the time range
          </li>
          <li>
            Using different field filters
          </li>
          <li>
            Changing the global filters
          </li>
        </ul>
      </EuiText>
    `);
  });
});
