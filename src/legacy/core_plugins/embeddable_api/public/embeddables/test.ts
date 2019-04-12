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

/* eslint-disable max-classes-per-file */
import * as Rx from 'rxjs';

interface AnimalData {
  sound: string;
}

// class Animal<D extends AnimalData = AnimalData> {
//   public readonly data: D;

//   constructor(data: D) {
//     this.data = data;
//   }

//   debug() {
//     debug(this);
//   }
// }

// function debug(animal: Animal) {
//   console.log(animal.data);
// }

class Animal<D extends {} = {}> {
  public readonly data: D;
  private readonly listeners: Array<(d: D) => void> = [];

  constructor(data: D) {
    this.data = data;
  }

  debug() {
    debug(this);
  }
}

function debug(animal: Animal) {
  console.log(animal.data);
}

// class Cat extends Animal<{ sound: string }> {}

// doSomething(new Cat({ sound: 'meow' }));
