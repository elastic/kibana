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

import { NavControlsService } from './nav_controls_service';
import { take } from 'rxjs/operators';

describe('RecentlyAccessed#start()', () => {
  const getStart = () => {
    return new NavControlsService().start();
  };

  describe('left side', () => {
    it('allows registration', async () => {
      const navControls = getStart();
      const nc = { mount: jest.fn() };
      navControls.registerLeft(nc);
      expect(
        await navControls
          .getLeft$()
          .pipe(take(1))
          .toPromise()
      ).toEqual([nc]);
    });

    it('sorts controls by order property', async () => {
      const navControls = getStart();
      const nc1 = { mount: jest.fn(), order: 10 };
      const nc2 = { mount: jest.fn(), order: 0 };
      const nc3 = { mount: jest.fn(), order: 20 };
      navControls.registerLeft(nc1);
      navControls.registerLeft(nc2);
      navControls.registerLeft(nc3);
      expect(
        await navControls
          .getLeft$()
          .pipe(take(1))
          .toPromise()
      ).toEqual([nc2, nc1, nc3]);
    });
  });

  describe('right side', () => {
    it('allows registration', async () => {
      const navControls = getStart();
      const nc = { mount: jest.fn() };
      navControls.registerRight(nc);
      expect(
        await navControls
          .getRight$()
          .pipe(take(1))
          .toPromise()
      ).toEqual([nc]);
    });

    it('sorts controls by order property', async () => {
      const navControls = getStart();
      const nc1 = { mount: jest.fn(), order: 10 };
      const nc2 = { mount: jest.fn(), order: 0 };
      const nc3 = { mount: jest.fn(), order: 20 };
      navControls.registerRight(nc1);
      navControls.registerRight(nc2);
      navControls.registerRight(nc3);
      expect(
        await navControls
          .getRight$()
          .pipe(take(1))
          .toPromise()
      ).toEqual([nc2, nc1, nc3]);
    });
  });
});
