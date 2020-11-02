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

export const semverGte = (semver1: string, semver2: string) => {
  const regex = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;
  const matches1 = regex.exec(semver1) as RegExpMatchArray;
  const matches2 = regex.exec(semver2) as RegExpMatchArray;

  const [, major1, minor1, patch1] = matches1;
  const [, major2, minor2, patch2] = matches2;

  return (
    major1 > major2 ||
    (major1 === major2 && (minor1 > minor2 || (minor1 === minor2 && patch1 >= patch2)))
  );
};
