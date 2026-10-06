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

  it('adds nothing beyond those two flags, so the set cannot drift from the default', () => {
    const { defaultConfig } = jest.requireActual('../../default/stateful/base.config');
    const { servers } = load();

    expect(servers.kbnTestServer.serverArgs).toEqual([
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.memory.enabled=true',
    ]);
  });

  it('keeps the default Kibana Elasticsearch principal', () => {
    const { defaultConfig } = jest.requireActual('../../default/stateful/base.config');
    const { servers } = load();

    expect(servers.servers?.elasticsearch).toEqual(defaultConfig.servers.elasticsearch);
  });
});
