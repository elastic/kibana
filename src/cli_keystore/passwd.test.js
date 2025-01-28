/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockKeystoreWithOldPassword =
  '1:9OsRzJI+gyDEH1ZjAHuKZFfYH7nEguzFRJwxWgj5WTJm5w+mzwKUzIdy65/lBW+XxY4wa1qYf0RSGJmfJKPz/er7pt58RJ8OgpicM2nCOMrqjPuovQr0QoMPbx736YlHEEIsuAaGAGItW7rlAQ==';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation(() => JSON.stringify(mockKeystoreWithOldPassword)),
  existsSync: jest.fn().mockImplementation(() => true),
  writeFileSync: jest.fn(),
}));

import * as prompt from '../cli/keystore/utils/prompt';

import { Keystore } from '../cli/keystore';
import { passwd } from './passwd';
import fs from 'fs';

describe('Kibana keystore', () => {
  describe('has_passwd', () => {
    it('changes the password', async () => {
      const keystore = new Keystore('keystore', 'old_password');
      jest.spyOn(prompt, 'question').mockResolvedValue('new_password');
      await passwd(keystore);
      const newKeystoreData = fs.writeFileSync.mock.calls[0][1];
      jest.spyOn(fs, 'readFileSync').mockReturnValue(newKeystoreData);
      const newKeystore = await Keystore.initialize('keystore', 'new_password');
      expect(newKeystore.data).toEqual({ hello: 'world' });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
