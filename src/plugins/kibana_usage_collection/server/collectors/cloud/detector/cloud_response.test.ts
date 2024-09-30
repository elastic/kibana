/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CloudServiceResponse } from './cloud_response';

describe('CloudServiceResponse', () => {
  const cloudName = 'my_cloud';

  const id = 'my-id';
  const vmType = 'bare-metal1';
  const region = 'my-house';
  const zone = 'my-house-master-bedroom';
  const metadata = { availabilityZone: 'my-house-1' };

  const confirmed = new CloudServiceResponse(cloudName, true, {
    id,
    vmType,
    region,
    zone,
    metadata,
  });
  const unconfirmed = CloudServiceResponse.unconfirmed(cloudName);

  it('getName() matches constructor value', () => {
    expect(confirmed.getName()).toBe(cloudName);
    expect(unconfirmed.getName()).toBe(cloudName);
  });

  it('isConfirmed() matches constructor value', () => {
    expect(confirmed.isConfirmed()).toBe(true);
    expect(unconfirmed.isConfirmed()).toBe(false);
  });

  it('toJSON() should return object representing values', () => {
    expect(confirmed.toJSON()).toEqual({
      name: cloudName,
      id,
      vm_type: vmType,
      region,
      zone,
      metadata,
    });
  });

  it('toJSON() should throw an error when unconfirmed', () => {
    expect(() => unconfirmed.toJSON()).toThrowError(`[${cloudName}] is not confirmed`);
  });
});
