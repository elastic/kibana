/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { openModal } from './shard_failure_open_modal_button.test.mocks';
import React from 'react';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import ShardFailureOpenModalButton from './shard_failure_open_modal_button';
import { shardFailureRequest } from './__mocks__/shard_failure_request';
import { shardFailureResponse } from './__mocks__/shard_failure_response';
import { findTestSubject } from '@elastic/eui/lib/test';

const theme = themeServiceMock.createStartContract();

describe('ShardFailureOpenModalButton', () => {
  it('triggers the openModal function when "Show details" button is clicked', () => {
    const component = mountWithIntl(
      <ShardFailureOpenModalButton
        request={shardFailureRequest}
        response={shardFailureResponse}
        theme={theme}
        title="test"
      />
    );
    findTestSubject(component, 'openShardFailureModalBtn').simulate('click');
    expect(openModal).toHaveBeenCalled();
  });
});
