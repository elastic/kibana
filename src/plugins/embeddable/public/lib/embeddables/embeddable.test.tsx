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

import { skip, take } from 'rxjs/operators';
import { Embeddable } from './embeddable';
import { EmbeddableOutput, EmbeddableInput } from './i_embeddable';
import { ViewMode } from '../types';
import { ContactCardEmbeddable } from '../test_samples/embeddables/contact_card/contact_card_embeddable';
import { FilterableEmbeddable } from '../test_samples/embeddables/filterable_embeddable';
import type { Filter } from '../../../../data/public';

class TestClass {
  constructor() {}
}

interface Output extends EmbeddableOutput {
  testClass: TestClass;
  inputUpdatedTimes: number;
}

class OutputTestEmbeddable extends Embeddable<EmbeddableInput, Output> {
  public readonly type = 'test';
  constructor() {
    super(
      { id: 'test', viewMode: ViewMode.VIEW },
      { testClass: new TestClass(), inputUpdatedTimes: 0 }
    );

    this.getInput$().subscribe(() => {
      this.updateOutput({ inputUpdatedTimes: this.getOutput().inputUpdatedTimes + 1 });
    });
  }

  reload() {}
}

test('Embeddable calls input subscribers when changed', async (done) => {
  const hello = new ContactCardEmbeddable(
    { id: '123', firstName: 'Brienne', lastName: 'Tarth' },
    { execAction: (() => null) as any }
  );

  const subscription = hello
    .getInput$()
    .pipe(skip(1))
    .subscribe((input) => {
      expect(input.nameTitle).toEqual('Sir');
      done();
      subscription.unsubscribe();
    });

  hello.updateInput({ nameTitle: 'Sir' });
});

test('Embeddable reload is called if lastReloadRequest input time changes', async () => {
  const hello = new FilterableEmbeddable({ id: '123', filters: [], lastReloadRequestTime: 0 });

  hello.reload = jest.fn();

  hello.updateInput({ lastReloadRequestTime: 1 });

  expect(hello.reload).toBeCalledTimes(1);
});

test('Embeddable reload is called if lastReloadRequest input time changed and new input is used', async () => {
  const hello = new FilterableEmbeddable({ id: '123', filters: [], lastReloadRequestTime: 0 });

  const aFilter = ({} as unknown) as Filter;
  hello.reload = jest.fn(() => {
    // when reload is called embeddable already has new input
    expect(hello.getInput().filters).toEqual([aFilter]);
  });

  hello.updateInput({ lastReloadRequestTime: 1, filters: [aFilter] });

  expect(hello.reload).toBeCalledTimes(1);
});

test('Embeddable reload is not called if lastReloadRequest input time does not change', async () => {
  const hello = new FilterableEmbeddable({ id: '123', filters: [], lastReloadRequestTime: 1 });

  hello.reload = jest.fn();

  hello.updateInput({ lastReloadRequestTime: 1 });

  expect(hello.reload).toBeCalledTimes(0);
});

test('updating output state retains instance information', async () => {
  const outputTest = new OutputTestEmbeddable();
  expect(outputTest.getOutput().testClass).toBeInstanceOf(TestClass);
  expect(outputTest.getOutput().inputUpdatedTimes).toBe(1);
  outputTest.updateInput({ viewMode: ViewMode.EDIT });
  expect(outputTest.getOutput().inputUpdatedTimes).toBe(2);
  expect(outputTest.getOutput().testClass).toBeInstanceOf(TestClass);
});

test('updated$ called after reload and batches input/output changes', async () => {
  const hello = new ContactCardEmbeddable(
    { id: '123', firstName: 'Brienne', lastName: 'Tarth' },
    { execAction: (() => null) as any }
  );

  const reloadSpy = jest.spyOn(hello, 'reload');

  const input$ = hello.getInput$().pipe(skip(1));
  let inputEmittedTimes = 0;
  input$.subscribe(() => {
    inputEmittedTimes++;
  });

  const updated$ = hello.getUpdated$();
  let updatedEmittedTimes = 0;
  updated$.subscribe(() => {
    updatedEmittedTimes++;
  });
  const updatedPromise = updated$.pipe(take(1)).toPromise();

  hello.updateInput({ nameTitle: 'Sir', lastReloadRequestTime: Date.now() });
  expect(reloadSpy).toHaveBeenCalledTimes(1);
  expect(inputEmittedTimes).toBe(1);
  expect(updatedEmittedTimes).toBe(0);

  await updatedPromise;

  expect(updatedEmittedTimes).toBe(1);
});
