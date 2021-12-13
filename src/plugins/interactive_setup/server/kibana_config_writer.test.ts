/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('fs/promises');
jest.mock('crypto');
import { constants } from 'fs';

import { loggingSystemMock } from 'src/core/server/mocks';

import { KibanaConfigWriter } from './kibana_config_writer';

describe('KibanaConfigWriter', () => {
  let mockFsAccess: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockReadFile: jest.Mock;
  let kibanaConfigWriter: KibanaConfigWriter;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1234);

    const fsMocks = jest.requireMock('fs/promises');
    mockFsAccess = fsMocks.access;
    mockWriteFile = fsMocks.writeFile;
    mockReadFile = fsMocks.readFile;

    mockReadFile.mockResolvedValue('');

    const mockCrypto = jest.requireMock('crypto');
    mockCrypto.X509Certificate = function (cert: string) {
      if (cert === 'invalid-cert') {
        throw new Error('Invalid certificate');
      }
      return {
        fingerprint256:
          'D4:86:CE:00:AC:71:E4:1D:2B:70:D0:87:A5:55:FA:5D:D1:93:6C:DB:45:80:79:53:7B:A3:AC:13:3E:48:34:D6',
      };
    };

    kibanaConfigWriter = new KibanaConfigWriter(
      '/some/path/kibana.yml',
      '/data',
      loggingSystemMock.createLogger()
    );
  });

  afterEach(() => jest.resetAllMocks());

  describe('#isConfigWritable()', () => {
    it('returns `false` if data directory is not writable even if kibana yml is writable', async () => {
      mockFsAccess.mockImplementation((path, modifier) =>
        path === '/data' && modifier === constants.W_OK ? Promise.reject() : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(false);
    });

    it('returns `false` if kibana yml is NOT writable if even data directory is writable', async () => {
      mockFsAccess.mockImplementation((path, modifier) =>
        path === '/some/path/kibana.yml' && modifier === constants.W_OK
          ? Promise.reject()
          : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(false);
    });

    it('returns `true` if both kibana yml and data directory are writable', async () => {
      mockFsAccess.mockResolvedValue(undefined);

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(true);
    });

    it('returns `true` even if kibana yml does not exist even if data directory is writable', async () => {
      mockFsAccess.mockImplementation((path) =>
        path === '/some/path/kibana.yml' ? Promise.reject() : Promise.resolve()
      );

      await expect(kibanaConfigWriter.isConfigWritable()).resolves.toBe(false);
    });
  });

  describe('#writeConfig()', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(
        '# Default Kibana configuration for docker target\nserver.host: "0.0.0.0"\nserver.shutdownTimeout: "5s"'
      );
    });

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
      expect(mockWriteFile).toHaveBeenCalledWith('/data/ca_1234.crt', 'ca-content');
    });

    it('throws if cannot write config to yaml file', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Oh no!'));

      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no!]`);

      expect(mockWriteFile.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/data/ca_1234.crt",
            "ca-content",
          ],
          Array [
            "/some/path/kibana.yml",
            "# Default Kibana configuration for docker target
        server.host: \\"0.0.0.0\\"
        server.shutdownTimeout: \\"5s\\"

        # This section was automatically generated during setup.
        elasticsearch.hosts: [some-host]
        elasticsearch.serviceAccountToken: some-value
        elasticsearch.ssl.certificateAuthorities: [/data/ca_1234.crt]
        xpack.fleet.outputs: [{id: fleet-default-output, name: default, is_default: true, is_default_monitoring: true, type: elasticsearch, hosts: [some-host], ca_trusted_fingerprint: d486ce00ac71e41d2b70d087a555fa5dd1936cdb458079537ba3ac133e4834d6}]

        ",
          ],
        ]
      `);
    });

    it('throws if cannot read existing config', async () => {
      mockReadFile.mockRejectedValue(new Error('Oh no!'));

      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no!]`);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('throws if cannot parse existing config', async () => {
      mockReadFile.mockResolvedValue('foo: bar\nfoo: baz');

      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).rejects.toMatchInlineSnapshot(`
              [YAMLException: duplicated mapping key at line 2, column 1:
                  foo: baz
                  ^]
            `);

      expect(mockWriteFile).not.toHaveBeenCalled();
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

      expect(mockWriteFile.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/data/ca_1234.crt",
            "ca-content",
          ],
          Array [
            "/some/path/kibana.yml",
            "# Default Kibana configuration for docker target
        server.host: \\"0.0.0.0\\"
        server.shutdownTimeout: \\"5s\\"

        # This section was automatically generated during setup.
        elasticsearch.hosts: [some-host]
        elasticsearch.username: username
        elasticsearch.password: password
        elasticsearch.ssl.certificateAuthorities: [/data/ca_1234.crt]
        xpack.fleet.outputs: [{id: fleet-default-output, name: default, is_default: true, is_default_monitoring: true, type: elasticsearch, hosts: [some-host], ca_trusted_fingerprint: d486ce00ac71e41d2b70d087a555fa5dd1936cdb458079537ba3ac133e4834d6}]

        ",
          ],
        ]
      `);
    });

    it('throws if it cannot parse CA certificate', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'invalid-cert',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Invalid certificate]`);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('can successfully write elasticsearch config without CA certificate', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          host: 'some-host',
          username: 'username',
          password: 'password',
        })
      ).resolves.toBeUndefined();

      expect(mockWriteFile.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/some/path/kibana.yml",
            "# Default Kibana configuration for docker target
        server.host: \\"0.0.0.0\\"
        server.shutdownTimeout: \\"5s\\"

        # This section was automatically generated during setup.
        elasticsearch.hosts: [some-host]
        elasticsearch.username: username
        elasticsearch.password: password

        ",
          ],
        ]
      `);
    });

    it('can successfully write CA certificate and elasticsearch config with service token', async () => {
      await expect(
        kibanaConfigWriter.writeConfig({
          caCert: 'ca-content',
          host: 'some-host',
          serviceAccountToken: { name: 'some-token', value: 'some-value' },
        })
      ).resolves.toBeUndefined();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(mockReadFile).toHaveBeenCalledWith('/some/path/kibana.yml', 'utf-8');

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      expect(mockWriteFile.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/data/ca_1234.crt",
            "ca-content",
          ],
          Array [
            "/some/path/kibana.yml",
            "# Default Kibana configuration for docker target
        server.host: \\"0.0.0.0\\"
        server.shutdownTimeout: \\"5s\\"

        # This section was automatically generated during setup.
        elasticsearch.hosts: [some-host]
        elasticsearch.serviceAccountToken: some-value
        elasticsearch.ssl.certificateAuthorities: [/data/ca_1234.crt]
        xpack.fleet.outputs: [{id: fleet-default-output, name: default, is_default: true, is_default_monitoring: true, type: elasticsearch, hosts: [some-host], ca_trusted_fingerprint: d486ce00ac71e41d2b70d087a555fa5dd1936cdb458079537ba3ac133e4834d6}]

        ",
          ],
        ]
      `);
    });

    describe('with conflicts', () => {
      beforeEach(() => {
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('some date');
        mockReadFile.mockResolvedValue(
          '# Default Kibana configuration for docker target\nserver.host: "0.0.0.0"\nserver.shutdownTimeout: "5s"\nelasticsearch.hosts: [ "http://elasticsearch:9200" ]\n\nmonitoring.ui.container.elasticsearch.enabled: true'
        );
      });

      it('can successfully write CA certificate and elasticsearch config', async () => {
        await expect(
          kibanaConfigWriter.writeConfig({
            caCert: 'ca-content',
            host: 'some-host',
            serviceAccountToken: { name: 'some-token', value: 'some-value' },
          })
        ).resolves.toBeUndefined();

        expect(mockReadFile).toHaveBeenCalledTimes(1);
        expect(mockReadFile).toHaveBeenCalledWith('/some/path/kibana.yml', 'utf-8');

        expect(mockWriteFile).toHaveBeenCalledTimes(2);
        expect(mockWriteFile.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "/data/ca_1234.crt",
              "ca-content",
            ],
            Array [
              "/some/path/kibana.yml",
              "### >>>>>>> BACKUP START: Kibana interactive setup (some date)

          # Default Kibana configuration for docker target
          #server.host: \\"0.0.0.0\\"
          #server.shutdownTimeout: \\"5s\\"
          #elasticsearch.hosts: [ \\"http://elasticsearch:9200\\" ]

          #monitoring.ui.container.elasticsearch.enabled: true
          ### >>>>>>> BACKUP END: Kibana interactive setup (some date)

          # This section was automatically generated during setup.
          server.host: 0.0.0.0
          server.shutdownTimeout: 5s
          elasticsearch.hosts: [some-host]
          monitoring.ui.container.elasticsearch.enabled: true
          elasticsearch.serviceAccountToken: some-value
          elasticsearch.ssl.certificateAuthorities: [/data/ca_1234.crt]
          xpack.fleet.outputs: [{id: fleet-default-output, name: default, is_default: true, is_default_monitoring: true, type: elasticsearch, hosts: [some-host], ca_trusted_fingerprint: d486ce00ac71e41d2b70d087a555fa5dd1936cdb458079537ba3ac133e4834d6}]

          ",
            ],
          ]
        `);
      });
    });
  });
});
