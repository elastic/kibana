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
import ReactDOM from 'react-dom';
import App from './app';
import * as serviceWorker from './service_worker';
import { pretty as p } from './utils/pretty';
import { tryCatch as tc } from './utils/either';
import './styles/tailwind.css';

const rootEl = document.getElementById.bind(document, 'root');
const initialData = window.initialData;
const tryInit = () => tc(() => initialData);
const tryOneProp = () => tc(() => initialData.testRunnerTypes);

tryInit()
  .chain(tryOneProp)
  .map(boot);

function boot(testRunnerTypes) {
  const { buildStats, historicalItems, currentJobTimeStamp, currentItem } = initialData;
  initPrint(initialData);
  ReactDOM.render(
    <App
      testRunnerTypes={testRunnerTypes}
      buildStats={buildStats}
      historicalItems={historicalItems}
      currentJobTimeStamp={currentJobTimeStamp}
      currentItem={currentItem}
    />,
    rootEl()
  );
}

function initPrint(x) {
  console.log(`\n### initial data: \n\n${p(x)}`);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
