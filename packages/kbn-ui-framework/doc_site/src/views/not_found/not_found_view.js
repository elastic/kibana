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

import React from 'react';

import { Link } from 'react-router'; // eslint-disable-line

export const NotFoundView = () => (
  <div className="guideContentPage">
    <div className="guideContentPage__content">
      <h1 className="guideTitle">
        Wow, a 404! You just created <em>something</em> from <em>nothing</em>.
      </h1>

      <p className="guideText">
        You visited a page which doesn&rsquo;t exist, causing <em>this</em> page to exist. This page
        thanks you for summoning it into existence from the raw fabric of reality, but it thinks you
        may find another page more interesting. Might it suggest the{' '}
        {
          <Link className="guideLink" to="/">
            home page
          </Link>
        }
        ?
      </p>
    </div>
  </div>
);
