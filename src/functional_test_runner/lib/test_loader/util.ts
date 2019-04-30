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

export const shareAnyItem = (a: any[], b: any[]) => {
  if (!a.length || !b.length) {
    return false;
  }

  if (a.length < b.length) {
    [a, b] = [b, a];
  }

  return a.some(aItem => b.includes(aItem));
};

interface Named {
  name: string | undefined;
  parent?: Named;
}

export function getFullName(left: Named, right?: Named): string {
  const leftName = left.parent ? getFullName(left.parent, left) : left.name;

  if (!right || !right.name) {
    return leftName || '';
  }

  if (!leftName) {
    return right.name;
  }

  return `${leftName} ${right.name}`;
}
