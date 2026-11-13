/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BROWSER_PROFILES } from './browser_profiles';
import { VISITOR_LOCATIONS, pickVisitorLocation } from './visitor_locations';
import { edotBrowser } from '.';

describe('visitor locations', () => {
  it('describes each city as the GeoIP processor does, with a valid location', () => {
    for (const { geo } of VISITOR_LOCATIONS) {
      expect(geo['client.address']).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$/);
      expect(geo['geo.country.iso_code']).toMatch(/^[A-Z]{2}$/);
      expect(geo['geo.region.iso_code'].startsWith(`${geo['geo.country.iso_code']}-`)).toBe(true);
      expect(geo['geo.city_name']).not.toBe('');
      expect(Math.abs(geo['geo.location'].lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(geo['geo.location'].lon)).toBeLessThanOrEqual(180);
    }
    expect(new Set(VISITOR_LOCATIONS.map(({ id }) => id)).size).toBe(VISITOR_LOCATIONS.length);
  });

  it('picks a location by weight', () => {
    expect(VISITOR_LOCATIONS).toContain(pickVisitorLocation());
    expect(pickVisitorLocation(() => 0)).toBe(VISITOR_LOCATIONS[0]);
    expect(pickVisitorLocation(() => 0.999999)).toBe(
      VISITOR_LOCATIONS[VISITOR_LOCATIONS.length - 1]
    );
  });

  it('writes the location on the resource of every document of a visitor', () => {
    const [location] = VISITOR_LOCATIONS;
    const client = edotBrowser
      .app({ serviceName: 'storefront-web' })
      .client(BROWSER_PROFILES.chromeMacos, { sessionId: 'session-1' }, location);
    const [log] = client.sessionStart().serialize();

    expect(log.resource?.attributes).toMatchObject({
      'service.name': 'storefront-web',
      'browser.name': 'Chrome',
      'client.address': location.geo['client.address'],
      'geo.city_name': location.geo['geo.city_name'],
      'geo.country.iso_code': location.geo['geo.country.iso_code'],
      'geo.location': location.geo['geo.location'],
    });
  });

  it('leaves the location out without one', () => {
    const [log] = edotBrowser
      .app({ serviceName: 'storefront-web' })
      .client(BROWSER_PROFILES.chromeMacos, { sessionId: 'session-1' })
      .sessionStart()
      .serialize();

    expect(log.resource?.attributes).not.toHaveProperty('geo.location');
    expect(log.resource?.attributes).not.toHaveProperty('client.address');
  });
});
