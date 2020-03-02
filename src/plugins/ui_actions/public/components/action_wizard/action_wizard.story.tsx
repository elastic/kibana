/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState } from 'react';

import { storiesOf } from '@storybook/react';
import { ActionWizard } from './action_wizard';
import { ACTION_FACTORIES } from './test_data';

function Demo() {
  const [state, setState] = useState();

  return (
    <>
      <ActionWizard
        actionFactories={ACTION_FACTORIES}
        onChange={(factory, config) => {
          setState({
            factory,
            config,
          });
        }}
      />
      <div style={{ marginTop: '44px' }} />
      <hr />
      <div>Action Factory Type: {state?.factory?.type}</div>
      <div>Action Factory Config: {JSON.stringify(state?.config)}</div>
    </>
  );
}

storiesOf('components/ActionWizard', module)
  .add('default', () => <Demo />)
  .add('Long list of action factories', () => (
    // to make sure layout doesn't break
    <ActionWizard
      actionFactories={[
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
      ]}
      onChange={() => {}}
    />
  ));
