/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { setup } from './helpers';

describe('validation', () => {
  describe('from command', () => {
    describe('FROM <sources> [ METADATA <indices> ]', () => {
      describe('... <sources> ...', () => {
        test('display errors on unknown indices', async () => {
          const { expectErrors } = await setup();
          await expectErrors('fRoM remote-*:indexes*', ['Unknown index [remote-*:indexes*]']);
          await expectErrors('fRoM remote-*:indexes', ['Unknown index [remote-*:indexes]']);
          await expectErrors('fRoM remote-ccs:indexes', ['Unknown index [remote-ccs:indexes]']);
          await expectErrors('fRoM a_index, remote-ccs:indexes', [
            'Unknown index [remote-ccs:indexes]',
          ]);
        });
      });

      describe('... METADATA <indices>', () => {
        test('no errors on correct usage', async () => {
          const { expectErrors } = await setup();
          await expectErrors(`from remote-ccs:indexes METADATA _id`, [
            'Unknown index [remote-ccs:indexes]',
          ]);
          await expectErrors(`from *:indexes METADATA _id`, ['Unknown index [*:indexes]']);
        });
      });
    });
  });
});
