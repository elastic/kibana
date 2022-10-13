/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ShardFailureModal } from './shard_failure_modal';
import { shardFailureRequest } from './__mocks__/shard_failure_request';
import { shardFailureResponse } from './__mocks__/shard_failure_response';

describe('ShardFailureModal', () => {
  it('renders matching snapshot given valid properties', () => {
    const component = shallowWithIntl(
      <ShardFailureModal
        title="test"
        request={shardFailureRequest}
        response={shardFailureResponse}
        onClose={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
