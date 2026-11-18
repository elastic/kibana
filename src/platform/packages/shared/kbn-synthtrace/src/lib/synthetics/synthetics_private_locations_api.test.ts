/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { discoverPrivateLocation, pickPrivateLocation } from './synthetics_private_locations_api';

const LOCATION = { id: 'location-1', label: 'Location 1' };

describe('pickPrivateLocation', () => {
  it('returns the only private location, without the other fields of the response', () => {
    expect(
      pickPrivateLocation([{ ...LOCATION, agentPolicyId: 'policy' } as typeof LOCATION])
    ).toEqual(LOCATION);
  });

  it('ignores invalid locations', () => {
    expect(pickPrivateLocation([{ id: 'gone', label: 'Gone', isInvalid: true }, LOCATION])).toEqual(
      LOCATION
    );
  });

  it('explains how to create a location when there is none', () => {
    expect(() => pickPrivateLocation([])).toThrow('Synthetics > Settings > Private locations');
    expect(() => pickPrivateLocation([{ id: 'gone', label: 'Gone', isInvalid: true }])).toThrow(
      'No private location found'
    );
  });

  it('does not choose between several locations, and lists them', () => {
    expect(() =>
      pickPrivateLocation([LOCATION, { id: 'location-2', label: 'Location 2' }])
    ).toThrow(/Found 2 private locations[\s\S]*location-1 "Location 1"[\s\S]*location-2/);
  });
});

describe('discoverPrivateLocation', () => {
  const kibanaReturning = (response: unknown) => ({ fetch: jest.fn().mockResolvedValue(response) });

  it('reads the locations of the default space', async () => {
    const kibana = kibanaReturning([LOCATION]);

    await expect(discoverPrivateLocation({ kibana })).resolves.toEqual(LOCATION);
    expect(kibana.fetch).toHaveBeenCalledWith('/api/synthetics/private_locations', {
      method: 'GET',
    });
  });

  it('reads the locations of another space', async () => {
    const kibana = kibanaReturning([LOCATION]);

    await discoverPrivateLocation({ kibana, spaceId: 'team a' });

    expect(kibana.fetch).toHaveBeenCalledWith('/s/team%20a/api/synthetics/private_locations', {
      method: 'GET',
    });
  });

  it('fails on a response that is not a list', async () => {
    await expect(discoverPrivateLocation({ kibana: kibanaReturning({}) })).rejects.toThrow(
      'expected a list of private locations'
    );
  });
});
