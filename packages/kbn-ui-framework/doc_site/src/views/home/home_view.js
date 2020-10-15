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

export const HomeView = () => (
  <div className="guideContentPage guideHomePage">
    <div className="guideContentPage__content">
      <div style={{ marginBottom: 40, backgroundColor: '#ffec9d', padding: 20 }}>
        <h1 className="guideTitle">The Kibana UI Framework has been DEPRECATED.</h1>

        <h2 className="guideTitle">
          Please use the <a href="https://github.com/elastic/eui">EUI Framework instead</a>.
        </h2>
      </div>
    </div>
  </div>
);
