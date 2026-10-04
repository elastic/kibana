/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('nightshift_investigations config set', () => {
  const load = () => jest.requireActual('./classic.stateful.config');

  // Both flags default to false, and neither failing is visible from the outside:
  // without the first the whole plugin is absent, without the second the Memory
  // tab is silently not rendered. A dropped flag fails as a missing page, not as
  // an error, which is why it is asserted here.
  it('turns on the investigation engine and Semantic Memory', () => {
    const { servers } = load();

    expect(servers.kbnTestServer.serverArgs).toContain(
      '--xpack.nightshift_investigations.enabled=true'
    );
    expect(servers.kbnTestServer.serverArgs).toContain(
      '--xpack.nightshift_investigations.memory.enabled=true'
    );
  });

  it('adds nothing beyond those two flags and the credential swap, so the set cannot drift from the default', () => {
    const { defaultConfig } = jest.requireActual('../../default/stateful/base.config');
    const { servers } = load();
    const baseArgs: string[] = defaultConfig.kbnTestServer.serverArgs;
    const dropped = baseArgs.filter(
      (arg: string) =>
        arg.startsWith('--elasticsearch.username=') || arg.startsWith('--elasticsearch.password=')
    );

    expect(dropped).toHaveLength(2);
    // Everything else is the default set's arguments, in order, then the swap and
    // the two flags. A duplicate `--elasticsearch.username` would be ambiguous.
    expect(servers.kbnTestServer.serverArgs).toEqual([
      ...baseArgs.filter(
        (arg: string) =>
          !arg.startsWith('--elasticsearch.username=') &&
          !arg.startsWith('--elasticsearch.password=')
      ),
      '--elasticsearch.username=system_indices_superuser',
      `--elasticsearch.password=${defaultConfig.servers.elasticsearch.password}`,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.memory.enabled=true',
    ]);
  });

  // Kibana reaches `nightshift-semantic-memory` as `kibana_system` by default and
  // cannot create or read it, so the plugin logs a security_exception on boot and
  // the page lists nothing. The credentials have to be escalated or the suite tests
  // an empty store.
  it('runs Kibana as system_indices_superuser, which may manage the index Semantic Memory owns', () => {
    const { defaultConfig } = jest.requireActual('../../default/stateful/base.config');
    const { servers } = load();

    expect(defaultConfig.servers.elasticsearch.username).toBe('kibana_system');
    expect(servers.servers.elasticsearch.username).toBe('system_indices_superuser');
    // The password is unchanged: the default already pairs `kibana_system` with it.
    expect(servers.servers.elasticsearch.password).toBe(
      defaultConfig.servers.elasticsearch.password
    );
    // Only the user changes; the cluster the set talks to is still the default one.
    expect(servers.servers.elasticsearch.hostname).toBe(
      defaultConfig.servers.elasticsearch.hostname
    );
    expect(servers.servers.elasticsearch.port).toBe(defaultConfig.servers.elasticsearch.port);
  });
});
