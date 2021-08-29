/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('fs/promises');
import { constants } from 'fs';

import { loggingSystemMock } from 'src/core/server/mocks';

import { KibanaConfigWriter } from './kibana_config_writer';

describe('KibanaConfigWriter', () => {
  let mockFsAccess: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockAppendFile: jest.Mock;
  let kibanaConfigWriter: KibanaConfigWriter;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1234);

    const fsMocks = jest.requireMock('fs/promises');
    mockFsAccess = fsMocks.access;
    mockWriteFile = fsMocks.writeFile;
    mockAppendFile = fsMocks.appendFile;

    kibanaConfigWriter = new KibanaConfigWriter(
      '/some/path/kibana.yml',
      loggingSystemMock.createLogger()
    );
  });

  afterEach(() => jest.resetAllMocks());

  describe('#isConfigWritable()', () => {
    it('returns `false` if config directory is not writable even if kibana yml is writable', async () => {
      mockFsAccess.mockImplementation((path, modifier) =>
        path === '/some/path' && modifier === constants.W_OK ? Promise.reject() : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(false);
    });

    it('returns `false` if kibana yml is NOT writable if even config directory is writable', async () => {
      mockFsAccess.mockImplementation((path, modifier) =>
        path === '/some/path/kibana.yml' && modifier === constants.W_OK
          ? Promise.reject()
          : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(false);
    });

    it('returns `true` if both kibana yml and config directory are writable', async () => {
      mockFsAccess.mockResolvedValue(undefined);

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(true);
    });

    it('returns `true` even if kibana yml does not exist when config directory is writable', async () => {
      mockFsAccess.mockImplementation((path) =>
        path === '/some/path/kibana.yml' ? Promise.reject() : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(true);
    });
  });

  describe('#writeConfig()', () => {
    it('throws if cannot write CA file', async () => {
      mockWriteFile.mockRejectedValue(new Error('Oh no!'));

      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: '',
          serviceAccountToken: { name: '', value: '' },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no!]`);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith('/some/path/ca_1234.crt', 'ca-content');
      expect(mockAppendFile).not.toHaveBeenCalled();
    });

    it('throws if cannot append config to yaml file', async () => {
      mockAppendFile.mockRejectedValue(new Error('Oh no!'));

      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no!]`);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith('/some/path/ca_1234.crt', 'ca-content');
      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      expect(mockAppendFile).toHaveBeenCalledWith(
        '/some/path/kibana.yml',
        `

# This section was automatically generated during setup.
elasticsearch.hosts: [some-host]
elasticsearch.serviceAccountToken: some-value
elasticsearch.ssl.certificateAuthorities: [/some/path/ca_1234.crt]

`
      );
    });

    it('can successfully write CA certificate and elasticsearch config with service token', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).resolves.toBeUndefined();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith('/some/path/ca_1234.crt', 'ca-content');
      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      expect(mockAppendFile).toHaveBeenCalledWith(
        '/some/path/kibana.yml',
        `

# This section was automatically generated during setup.
elasticsearch.hosts: [some-host]
elasticsearch.serviceAccountToken: some-value
elasticsearch.ssl.certificateAuthorities: [/some/path/ca_1234.crt]

`
      );
    });

    it('can successfully write CA certificate and elasticsearch config with credentials', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          username: 'username',
          password: 'password',
        })
      ).resolves.toBeUndefined();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith('/some/path/ca_1234.crt', 'ca-content');
      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      expect(mockAppendFile).toHaveBeenCalledWith(
        '/some/path/kibana.yml',
        `

# This section was automatically generated during setup.
elasticsearch.hosts: [some-host]
elasticsearch.password: password
elasticsearch.username: username
elasticsearch.ssl.certificateAuthorities: [/some/path/ca_1234.crt]

`
      );
    });

    it('can successfully write elasticsearch config without CA certificate', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          host: 'some-host',
          username: 'username',
          password: 'password',
        })
      ).resolves.toBeUndefined();

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      expect(mockAppendFile).toHaveBeenCalledWith(
        '/some/path/kibana.yml',
        `

# This section was automatically generated during setup.
elasticsearch.hosts: [some-host]
elasticsearch.password: password
elasticsearch.username: username

`
      );
    });
  });
});
