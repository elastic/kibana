/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { NoFieldsCallout } from './no_fields_callout';

describe('UnifiedFieldList <NoFieldCallout />', () => {
  it('renders correctly for index with no fields', () => {
    const component = shallow(<NoFieldsCallout fieldsExistInIndex={false} />);
    expect(component).toMatchInlineSnapshot(`
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsExist"
        size="s"
        title="No fields exist in this data view."
      />
    `);
  });
  it('renders correctly when empty with no filters/timerange reasons', () => {
    const component = shallow(<NoFieldsCallout fieldsExistInIndex={true} />);
    expect(component).toMatchInlineSnapshot(`
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="There are no fields."
      />
    `);
  });
  it('renders correctly with passed defaultNoFieldsMessage', () => {
    const component = shallow(
      <NoFieldsCallout fieldsExistInIndex={true} defaultNoFieldsMessage="No empty fields" />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="No empty fields"
      />
    `);
  });

  it('renders properly when affected by field filter', () => {
    const component = shallow(
      <NoFieldsCallout fieldsExistInIndex={true} isAffectedByFieldFilter={true} />
    );
    expect(component).toMatchInlineSnapshot(`
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="No fields match the selected filters."
      >
        <strong>
          Try:
        </strong>
        <ul>
          <li>
            Using different field filters
          </li>
        </ul>
      </EuiCallOut>
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
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="There are no available fields that contain data."
      >
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
      </EuiCallOut>
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
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="No fields match the selected filters."
      >
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
      </EuiCallOut>
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
      <EuiCallOut
        color="warning"
        data-test-subj="noFieldsCallout-noFieldsMatch"
        size="s"
        title="No fields match the selected filters."
      >
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
      </EuiCallOut>
    `);
  });
});
