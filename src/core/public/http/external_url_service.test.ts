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

import { ExternalUrlConfig } from 'src/core/server/types';

import { injectedMetadataServiceMock } from '../mocks';
import { Sha256 } from '../utils';

import { ExternalUrlService } from './external_url_service';

const setupService = ({
  location,
  serverBasePath,
  policy,
}: {
  location: URL;
  serverBasePath: string;
  policy: ExternalUrlConfig['policy'];
}) => {
  const hashedPolicies = policy.map((entry) => {
    // If the host contains a `[`, then it's likely an IPv6 address. Otherwise, append a `.` if it doesn't already contain one
    const hostToHash =
      entry.host && !entry.host.includes('[') && !entry.host.endsWith('.')
        ? `${entry.host}.`
        : entry.host;
    return {
      ...entry,
      host: hostToHash ? new Sha256().update(hostToHash, 'utf8').digest('hex') : undefined,
    };
  });
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  injectedMetadata.getExternalUrlConfig.mockReturnValue({ policy: hashedPolicies });
  injectedMetadata.getServerBasePath.mockReturnValue(serverBasePath);

  const service = new ExternalUrlService();
  return {
    setup: service.setup({
      injectedMetadata,
      location,
    }),
  };
};

const internalRequestScenarios = [
  {
    description: 'without any policies',
    allowExternal: false,
    policy: [],
  },
  {
    description: 'with an unrestricted policy',
    allowExternal: true,
    policy: [
      {
        allow: true,
      },
    ],
  },
  {
    description: 'with a fully restricted policy',
    allowExternal: false,
    policy: [
      {
        allow: false,
      },
    ],
  },
];

describe('External Url Service', () => {
  describe('#validateUrl', () => {
    describe('internal requests with a server base path', () => {
      const serverBasePath = '/base-path';
      const serverRoot = `https://my-kibana.example.com:5601`;
      const kibanaRoot = `${serverRoot}${serverBasePath}`;
      const location = new URL(`${kibanaRoot}/app/management?q=1&bar=false#some-hash`);

      internalRequestScenarios.forEach(({ description, policy, allowExternal }) => {
        describe(description, () => {
          it('allows relative URLs that start with the server base path', () => {
            const { setup } = setupService({ location, serverBasePath, policy });
            const urlCandidate = `/some/path?foo=bar`;
            const result = setup.validateUrl(`${serverBasePath}${urlCandidate}`);

            expect(result).toBeInstanceOf(URL);
            expect(result?.toString()).toEqual(`${kibanaRoot}${urlCandidate}`);
          });

          it('allows absolute URLs to Kibana that start with the server base path', () => {
            const { setup } = setupService({ location, serverBasePath, policy });
            const urlCandidate = `${kibanaRoot}/some/path?foo=bar`;
            const result = setup.validateUrl(urlCandidate);

            expect(result).toBeInstanceOf(URL);
            expect(result?.toString()).toEqual(`${kibanaRoot}/some/path?foo=bar`);
          });

          if (allowExternal) {
            it('allows absolute URLs to Kibana that do not start with the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `${serverRoot}/some/path?foo=bar`;
              const result = setup.validateUrl(urlCandidate);

              expect(result).toBeInstanceOf(URL);
              expect(result?.toString()).toEqual(`${serverRoot}/some/path?foo=bar`);
            });

            it('allows relative URLs that attempt to bypass the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `/some/../../path?foo=bar`;
              const result = setup.validateUrl(`${serverBasePath}${urlCandidate}`);

              expect(result).toBeInstanceOf(URL);
              expect(result?.toString()).toEqual(`${serverRoot}/path?foo=bar`);
            });

            it('allows relative URLs that do not start with the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `/some/path?foo=bar`;
              const result = setup.validateUrl(urlCandidate);

              expect(result).toBeInstanceOf(URL);
              expect(result?.toString()).toEqual(`${serverRoot}/some/path?foo=bar`);
            });
          } else {
            it('disallows absolute URLs to Kibana that do not start with the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `${serverRoot}/some/path?foo=bar`;
              const result = setup.validateUrl(urlCandidate);

              expect(result).toBeNull();
            });

            it('disallows relative URLs that attempt to bypass the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `/some/../../path?foo=bar`;
              const result = setup.validateUrl(`${serverBasePath}${urlCandidate}`);

              expect(result).toBeNull();
            });

            it('disallows relative URLs that do not start with the server base path', () => {
              const { setup } = setupService({ location, serverBasePath, policy });
              const urlCandidate = `/some/path?foo=bar`;
              const result = setup.validateUrl(urlCandidate);

              expect(result).toBeNull();
            });
          }
        });
      });

      describe('handles protocol resolution bypass', () => {
        it('does not allow relative URLs that include a host', () => {
          const { setup } = setupService({ location, serverBasePath, policy: [] });
          const urlCandidate = `/some/path?foo=bar`;
          const result = setup.validateUrl(`//www.google.com${serverBasePath}${urlCandidate}`);

          expect(result).toBeNull();
        });

        it('does allow relative URLs that include a host if allowed by policy', () => {
          const { setup } = setupService({
            location,
            serverBasePath,
            policy: [
              {
                allow: true,
                host: 'www.google.com',
              },
            ],
          });
          const urlCandidate = `/some/path?foo=bar`;
          const result = setup.validateUrl(`//www.google.com${serverBasePath}${urlCandidate}`);

          expect(result).toBeInstanceOf(URL);
          expect(result?.toString()).toEqual(
            `https://www.google.com${serverBasePath}${urlCandidate}`
          );
        });
      });
    });

    describe('internal requests without a server base path', () => {
      const serverBasePath = '';
      const serverRoot = `https://my-kibana.example.com:5601`;
      const kibanaRoot = `${serverRoot}${serverBasePath}`;
      const location = new URL(`${kibanaRoot}/app/management?q=1&bar=false#some-hash`);

      internalRequestScenarios.forEach(({ description, policy }) => {
        describe(description, () => {
          it('allows relative URLs', () => {
            const { setup } = setupService({ location, serverBasePath, policy });
            const urlCandidate = `/some/path?foo=bar`;
            const result = setup.validateUrl(`${serverBasePath}${urlCandidate}`);

            expect(result).toBeInstanceOf(URL);
            expect(result?.toString()).toEqual(`${kibanaRoot}${urlCandidate}`);
          });

          it('allows absolute URLs to Kibana', () => {
            const { setup } = setupService({ location, serverBasePath, policy });
            const urlCandidate = `${kibanaRoot}/some/path?foo=bar`;
            const result = setup.validateUrl(urlCandidate);

            expect(result).toBeInstanceOf(URL);
            expect(result?.toString()).toEqual(`${kibanaRoot}/some/path?foo=bar`);
          });
        });
      });

      describe('handles protocol resolution bypass', () => {
        it('does not allow relative URLs that include a host', () => {
          const { setup } = setupService({ location, serverBasePath, policy: [] });
          const urlCandidate = `/some/path?foo=bar`;
          const result = setup.validateUrl(`//www.google.com${urlCandidate}`);

          expect(result).toBeNull();
        });

        it('allows relative URLs that include a host in the allow list', () => {
          const { setup } = setupService({
            location,
            serverBasePath,
            policy: [
              {
                allow: true,
                host: 'www.google.com',
              },
            ],
          });
          const urlCandidate = `/some/path?foo=bar`;
          const result = setup.validateUrl(`//www.google.com${urlCandidate}`);

          expect(result).toBeInstanceOf(URL);
          expect(result?.toString()).toEqual(`https://www.google.com${urlCandidate}`);
        });
      });
    });

    describe('external requests', () => {
      const serverBasePath = '/base-path';
      const serverRoot = `https://my-kibana.example.com:5601`;
      const kibanaRoot = `${serverRoot}${serverBasePath}`;
      const location = new URL(`${kibanaRoot}/app/management?q=1&bar=false#some-hash`);

      it('does not allow external urls by default', () => {
        const { setup } = setupService({ location, serverBasePath, policy: [] });
        const urlCandidate = `http://www.google.com`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeNull();
      });

      it('does not allow external urls with a fully restricted policy', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: false,
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeNull();
      });

      it('allows external urls with an unrestricted policy', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with a matching host and protocol in the allow list', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'www.google.com',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with a partially matching host and protocol in the allow list', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'google.com',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with a partially matching host and protocol in the allow list when the URL includes the root domain', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'google.com',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://www.google.com./foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with an IPv4 address', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: '192.168.10.12',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://192.168.10.12/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with an IPv6 address', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: '[2001:db8:85a3:8d3:1319:8a2e:370:7348]',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls that specify a locally addressable host', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'some-host-name',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://some-host-name/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('disallows external urls with a matching host and unmatched protocol', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'www.google.com',
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `http://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeNull();
      });

      it('allows external urls with a matching host and any protocol', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              host: 'www.google.com',
            },
          ],
        });
        const urlCandidate = `ftp://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('allows external urls with any host and matching protocol', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              protocol: 'https',
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeInstanceOf(URL);
        expect(result?.toString()).toEqual(urlCandidate);
      });

      it('disallows external urls that match multiple rules, one of which denies the request', () => {
        const { setup } = setupService({
          location,
          serverBasePath,
          policy: [
            {
              allow: true,
              protocol: 'https',
            },
            {
              allow: false,
              host: 'www.google.com',
            },
          ],
        });
        const urlCandidate = `https://www.google.com/foo?bar=baz`;
        const result = setup.validateUrl(urlCandidate);

        expect(result).toBeNull();
      });
    });
  });
});
