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

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import useObservable from 'react-use/lib/useObservable';
import { ConfigureAction } from '.';
import { createSampleGoToUrlAction } from '../../tests';
import { ActionInternal } from '../../actions';

const action = new ActionInternal(createSampleGoToUrlAction());
const actionWithPresetConfig = new ActionInternal(createSampleGoToUrlAction());
actionWithPresetConfig.state.transitions.setConfig({
  url: 'http://google.com',
  openInNewTab: true,
});
const actionMissingCollectConfig = new ActionInternal({
  ...createSampleGoToUrlAction(),
  CollectConfig: undefined,
});

const DemoDefault: React.FC = () => {
  useObservable(action.state.state$);

  return (
    <div>
      <ConfigureAction action={action} />
      <br />
      <hr />
      <br />
      <pre>{JSON.stringify(action.serialize(), null, 4)}</pre>
    </div>
  );
};

storiesOf('components/ConfigureAction', module)
  .add('default', () => <DemoDefault />)
  .add('with preset config', () => <ConfigureAction action={actionWithPresetConfig} />)
  .add('missing CollectConfig', () => <ConfigureAction action={actionMissingCollectConfig} />);
