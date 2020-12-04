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

import { AccessorFn, Accessor } from '@elastic/charts';
import { BUCKET_TYPES } from '../../../data/public';
import { FakeParams, Aspect } from '../types';

export const getXAccessor = (xAspect: Aspect): Accessor | AccessorFn => {
  if (!xAspect.accessor) {
    return () => (xAspect.params as FakeParams)?.defaultValue;
  }

  if (
    !(
      (xAspect.aggType === BUCKET_TYPES.DATE_RANGE || xAspect.aggType === BUCKET_TYPES.RANGE) &&
      xAspect.formatter
    )
  ) {
    return xAspect.accessor;
  }

  const formatter = xAspect.formatter;
  const accessor = xAspect.accessor;
  return (d) => {
    const v = d[accessor];
    if (!v) {
      return;
    }
    const f = formatter(v);
    return f;
  };
};
