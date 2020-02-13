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

const fs = require('fs');
const historical = require('./test_suites_historical.json');
const allSuites = require('./test-suites.json');
const queues = {};

const historicalByTag = {};

for (const group of Object.keys(historical)) {
  historicalByTag[group] = {};
  for (const suite of Object.values(historical[group])) {
    historicalByTag[group][suite.tag] = suite.duration;
  }
}

Object.keys(allSuites).forEach(group => {
  const suites = allSuites[group];
  for (const suite of suites) {
    if (historicalByTag[group] && suite.tag in historicalByTag[group]) {
      suite.duration = historicalByTag[group][suite.tag];
    }
  }

  suites.sort((a, b) => b.duration - a.duration);

  const suitesByConfig = {};
  suites.forEach(suite => {
    suite.config = suite.config.replace(/^x-pack\//, ''); // TODO

    suitesByConfig[suite.config] = suitesByConfig[suite.config] || [];
    suitesByConfig[suite.config].push(suite);
  });

  const finalQueue = [];

  const nextGroup = () => {
    const group = [];

    // const next = suites.shift();
    const next = suites[0];
    const byConfig = suitesByConfig[next.config];
    let totalDuration = 0;
    while (totalDuration < 60 * 12 && byConfig.length > 0) {
      const suite =
        totalDuration === 0 || byConfig[0].duration + totalDuration <= 60 * 12
          ? byConfig.shift()
          : byConfig.pop();

      totalDuration += suite.duration;
      const index = suites.indexOf(suite);
      if (index >= 0) {
        suites.splice(index, 1);
      }

      group.push(suite);
    }

    return { config: next.config, tags: group.map(s => s.tag), estimatedDuration: totalDuration };
  };

  while (suites.length) {
    finalQueue.push(nextGroup());
  }

  queues[group] = finalQueue;
});

fs.writeFileSync('test-suites-ci-plan.json', JSON.stringify(queues, null, 2));
