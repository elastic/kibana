/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface CloudServiceResponseOptions {
  id?: string;
  vmType?: string;
  region?: string;
  zone?: string;
  metadata?: Record<string, unknown>;
}

export interface CloudServiceResponseJson {
  name: string;
  id?: string;
  vm_type?: string;
  region?: string;
  zone?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a single response from any individual CloudService.
 */
export class CloudServiceResponse {
  private readonly _name: string;
  private readonly _confirmed: boolean;
  private readonly _id?: string;
  private readonly _vmType?: string;
  private readonly _region?: string;
  private readonly _zone?: string;
  private readonly _metadata?: Record<string, unknown>;

  /**
   * Create an unconfirmed CloudServiceResponse by the name.
   */
  static unconfirmed(name: string) {
    return new CloudServiceResponse(name, false, {});
  }

  /**
   * Create a new CloudServiceResponse.
   *
   * @param {String} name The name of the CloudService.
   * @param {Boolean} confirmed Confirmed to be the current CloudService.
   * @param {String} id The optional ID of the VM (depends on the cloud service).
   * @param {String} vmType The optional type of VM (depends on the cloud service).
   * @param {String} region The optional region of the VM (depends on the cloud service).
   * @param {String} availabilityZone The optional availability zone within the region (depends on the cloud service).
   * @param {Object} metadata The optional metadata associated with the VM.
   */
  constructor(
    name: string,
    confirmed: boolean,
    { id, vmType, region, zone, metadata }: CloudServiceResponseOptions
  ) {
    this._name = name;
    this._confirmed = confirmed;
    this._id = id;
    this._metadata = metadata;
    this._region = region;
    this._vmType = vmType;
    this._zone = zone;
  }

  /**
   * Get the name of the CloudService associated with the current response.
   */
  getName() {
    return this._name;
  }

  /**
   * Determine if the Cloud Service is confirmed to exist.
   */
  isConfirmed() {
    return this._confirmed;
  }

  /**
   * Create a plain JSON object that can be indexed that represents the response.
   */
  toJSON(): CloudServiceResponseJson {
    if (!this._confirmed) {
      throw new Error(`[${this._name}] is not confirmed`);
    }

    return {
      name: this._name,
      id: this._id,
      vm_type: this._vmType,
      region: this._region,
      zone: this._zone,
      metadata: this._metadata,
    };
  }
}
