/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { shallow } from 'enzyme';

import { FieldFormatEditor } from './field_format_editor';
import { DefaultFormatEditor } from './editors/default';

class TestEditor extends PureComponent {
  render() {
    if (this.props) {
      return null;
    }
    return <div>Test editor</div>;
  }
}

const formatEditors = {
  byFormatId: {
    ip: TestEditor,
    number: TestEditor,
  },
  getById: jest.fn(() => TestEditor),
};

describe('FieldFormatEditor', () => {
  it('should render normally', async () => {
    const component = shallow(
      <FieldFormatEditor
        fieldType="number"
        fieldFormat={{} as DefaultFormatEditor}
        fieldFormatId="number"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if there is no editor for the format', async () => {
    const component = shallow(
      <FieldFormatEditor
        fieldType="number"
        fieldFormat={{} as DefaultFormatEditor}
        fieldFormatId="ip"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
