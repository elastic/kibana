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

import { PainlessLang } from './painless';
import { XJsonLang } from './xjson';
// @ts-ignore
import xJsonWorkerSrc from '!!raw-loader!../target/public/xjson.editor.worker.js';
// @ts-ignore
import painlessWorkerSrc from '!!raw-loader!../target/public/painless.editor.worker.js';

const mapLanguageIdToWorker: { [key: string]: any } = {
  [XJsonLang.ID]: xJsonWorkerSrc,
  [PainlessLang.ID]: painlessWorkerSrc,
};

// @ts-ignore
window.MonacoEnvironment = {
  getWorker: (module: string, languageId: string) => {
    const workerSrc = mapLanguageIdToWorker[languageId];

    if (workerSrc) {
      // In kibana we will probably build this once and then load with raw-loader
      const blob = new Blob([workerSrc], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    }
  },
};
