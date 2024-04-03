/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { SyncJobDocumentsPanel } from './documents_panel';

describe('DocumentsPanel', () => {
  const documents = {
    added: 10,
    removed: 0,
    total: 305,
    volume: 1120,
  };

  it('renders', () => {
    const wrapper = shallow(<SyncJobDocumentsPanel {...documents} />);

    expect(wrapper).toMatchSnapshot();
  });
});
