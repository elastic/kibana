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

import React, { FunctionComponent, useState } from 'react';
import classnames from 'classnames';
import { Header, HeaderProps } from './';

const IS_LOCKED_KEY = 'core.chrome.isLocked';

export const HeaderWrapper: FunctionComponent<HeaderProps> = props => {
  const initialIsLocked = localStorage.getItem(IS_LOCKED_KEY);
  const [isLocked, setIsLocked] = useState(initialIsLocked === 'true');
  const setIsLockedStored = (locked: boolean) => {
    localStorage.setItem(IS_LOCKED_KEY, `${locked}`);
    setIsLocked(locked);
  };
  const className = classnames(
    'chrHeaderWrapper',
    {
      'chrHeaderWrapper--navIsLocked': isLocked,
    },
    'hide-for-sharing'
  );
  return (
    <div className={className} data-test-subj="headerGlobalNav">
      <Header {...props} onIsLockedUpdate={setIsLockedStored} isLocked={isLocked} />
    </div>
  );
};
