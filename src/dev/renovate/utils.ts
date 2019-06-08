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

export const maybeMap = <T, T2>(input: T[] | undefined, fn: (i: T) => T2) =>
  input ? input.map(fn) : undefined;

export const maybeFlatMap = <T, T2>(input: T[] | undefined, fn: (i: T) => T2[]) =>
  input ? input.reduce((acc, i) => [...acc, ...fn(i)], [] as T2[]) : undefined;

export const wordRegExp = (word: string) => new RegExp(`(\\b|_)${word}(\\b|_)`);

export const getTypePackageName = (pkgName: string) => {
  const scopedPkgRe = /^@(.+?)\/(.+?)$/;
  const match = pkgName.match(scopedPkgRe);
  return `@types/${match ? `${match[1]}__${match[2]}` : pkgName}`;
};

export const unwrapTypesPackage = (pkgName: string) => {
  if (!pkgName.startsWith('@types')) {
    return;
  }

  const typesFor = pkgName.slice('@types/'.length);

  if (!typesFor.includes('__')) {
    return typesFor;
  }

  // @types packages use a convention for scoped packages, @types/org__name
  const [org, name] = typesFor.split('__');
  return `@${org}/${name}`;
};
