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

import expect from '@kbn/expect';
import {
  RequestFailure,
  FetchFailure,
  VersionConflict,
  MappingConflict,
  RestrictedMapping,
  CacheWriteFailure,
  FieldNotFoundInCache,
  DuplicateField,
  SavedObjectNotFound,
  PersistedStateError,
  VislibError,
  ContainerTooSmall,
  InvalidWiggleSelection,
  PieContainsAllZeros,
  InvalidLogScaleValues,
  StackedBarChartConfig,
  NoResults,
  KbnError
} from '../errors';

describe('ui/errors', () => {
  const errors = [
    new RequestFailure('an error', { }),
    new FetchFailure({ }),
    new VersionConflict({ }),
    new MappingConflict({ }),
    new RestrictedMapping('field', 'indexPattern'),
    new CacheWriteFailure(),
    new FieldNotFoundInCache('aname'),
    new DuplicateField('dupfield'),
    new SavedObjectNotFound('dashboard', '123'),
    new PersistedStateError(),
    new VislibError('err'),
    new ContainerTooSmall(),
    new InvalidWiggleSelection(),
    new PieContainsAllZeros(),
    new InvalidLogScaleValues(),
    new StackedBarChartConfig('err'),
    new NoResults()
  ];

  errors.forEach(error => {
    const className = error.constructor.name;
    it(`${className} has a message`, () => {
      expect(error.message).to.not.be.empty();
    });

    it(`${className} has a stack trace`, () => {
      expect(error.stack).to.not.be.empty();
    });

    it (`${className} is an instance of KbnError`, () => {
      expect(error instanceof KbnError).to.be(true);
    });
  });
});
