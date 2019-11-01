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

import { fromEventPattern } from 'rxjs';
import { map } from 'rxjs/operators';
// import { tap } from 'rxjs/operators';
import moment from 'moment';
import jsonStream from './json_stream';

const XPACK = 'x-pack';

export default ({ coveragePath }, log) => {

  const objStream = jsonStream(coveragePath)
    .on('done', () => log.debug(`Done streaming from \n\t${coveragePath}`));

  const addCoveragePath = addPath.bind(null, coveragePath);

  return fromEventPattern(_ => objStream.on('node', '!.*', _))
    .pipe(
      map(statsAndPath),
      map(addCoveragePath),
      map(coverageType),
      map(truncate),
      map(timeStamp),
      map(distro),
      map(massage),
      map(enrich),
      map(last),
      // debug stream
      // tap(x => console.log(`\n### x\n\t${JSON.stringify(x, null, 2)}`)),
    );
};
// TODO: This fn is quick and dirty, fixup later
function massage(obj) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object') {
      const o = obj[key];
      Object.keys(o).forEach(k => {
        if (o[k] === 'Unknown') {
          o[k] = 0;
        }
      });
    }
    // console.log(obj[key])
  });
  return obj;
}
function statsAndPath(...xs) {
  const [coveredFilePath] = xs[0][1];
  const [stats] = xs[0];
  return {
    coveredFilePath,
    ...stats,
  };
}
function addPath(coveragePath, obj) {
  return {
    coveragePath: trimLeft('target', coveragePath),
    ...obj,
  };
}
function trimLeft(text, x) {
  const re = new RegExp(`(?:.*)(${text}.*$)`, 'gm');
  return x.replace(re, '$1');
}
function truncate(obj) {
  const { coveredFilePath } = obj;

  const text = 'kibana';
  if (coveredFilePath.includes(text)) {
    obj.coveredFilePath = trimLeft(text, coveredFilePath);
  }

  return obj;
}
function timeStamp(obj) {
  return {
    ...obj,
    '@timestamp': process.env.TIME_STAMP || moment().format(),
  };
}
function distro(obj) {
  const { coveredFilePath } = obj;
  let distro;
  if (process.env.DISTRO) {
    distro = process.env.DISTRO;
  } else {
    distro = coveredFilePath.includes(XPACK) ? XPACK : 'OSS';
  }

  return {
    ...obj,
    distro,
  };
}
function coverageType(obj) {
  const { coveragePath } = obj;

  let coverageType = 'OTHER';
  const basePath = 'kibana-coverage';

  if (coveragePath.includes(`${basePath}/mocha`)) {
    coverageType = 'MOCHA';
  }

  if (coveragePath.includes(`${basePath}/jest`)) {
    coverageType = 'JEST';
  }

  if (coveragePath.includes('functional')) {
    coverageType = 'FUNCTIONAL';
  }

  return {
    coverageType,
    ...obj,
  };
}
// last :: obj -> obj
// Since we do not wish to post a path if it's a total,
// drop it when it's a total (totals go to a different index).
function last(obj) {
  const { coveredFilePath } = obj;
  if (coveredFilePath === 'total') {
    delete obj.coveredFilePath;
  }
  return obj;
}
function enrich(obj) {
  const { env } = process;
  if (env.BUILD_ID) {
    obj.BUILD_ID = env.BUILD_ID;
  }

  return {
    ...obj,
  };
}
