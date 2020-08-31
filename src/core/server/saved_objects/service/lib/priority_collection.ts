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

interface PriorityCollectionEntry<T> {
  priority: number;
  value: T;
}

export class PriorityCollection<T> {
  private readonly array: Array<PriorityCollectionEntry<T>> = [];

  public add(priority: number, value: T) {
    const foundIndex = this.array.findIndex((current) => {
      if (priority === current.priority) {
        throw new Error('Already have entry with this priority');
      }

      return priority < current.priority;
    });

    const spliceIndex = foundIndex === -1 ? this.array.length : foundIndex;
    this.array.splice(spliceIndex, 0, { priority, value });
  }

  public has(predicate: (value: T) => boolean): boolean {
    return this.array.some((entry) => predicate(entry.value));
  }

  public toPrioritizedArray(): T[] {
    return this.array.map((entry) => entry.value);
  }
}
