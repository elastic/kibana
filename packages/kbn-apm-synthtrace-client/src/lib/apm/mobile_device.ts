/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { Span } from './span';
import { Transaction } from './transaction';
import { ApmFields, SpanParams, GeoLocation, ApmApplicationMetricFields } from './apm_fields';
import { generateLongId } from '../utils/generate_id';
import { Metricset } from './metricset';
import { ApmError } from './apm_error';

export interface DeviceInfo {
  manufacturer: string;
  modelIdentifier: string;
  modelName?: string;
}

export interface OSInfo {
  osType: 'ios' | 'android';
  osVersion: string;
  osFull?: string;
  runtimeVersion?: string;
}

export interface NetworkConnectionInfo {
  type: 'unavailable' | 'wifi' | 'wired' | 'cell' | 'unknown';
  subType?: string;
  carrierName?: string;
  carrierMCC?: string;
  carrierMNC?: string;
  carrierICC?: string;
}

export interface GeoInfo {
  clientIp: string;
  cityName?: string;
  continentName?: string;
  countryIsoCode?: string;
  countryName?: string;
  regionName?: string;
  regionIsoCode?: string;
  location?: GeoLocation;
}

export class MobileDevice extends Entity<ApmFields> {
  networkConnection: NetworkConnectionInfo;

  constructor(public readonly fields: ApmFields) {
    super(fields);
    this.networkConnection = { type: 'unavailable' };
  }

  deviceInfo(...options: [DeviceInfo] | [string, string] | [string, string, string]) {
    let manufacturer: string;
    let modelIdentifier: string;
    let modelName: string | undefined;
    if (options.length === 3) {
      manufacturer = options[0];
      modelIdentifier = options[1];
      modelName = options[2];
    } else if (options.length === 2) {
      manufacturer = options[0];
      modelIdentifier = options[1];
    } else {
      manufacturer = options[0].manufacturer;
      modelIdentifier = options[0].modelIdentifier;
      modelName = options[0].modelName;
    }

    this.fields['device.manufacturer'] = manufacturer;
    this.fields['device.model.identifier'] = modelIdentifier;
    this.fields['device.model.name'] = modelName;
    return this;
  }

  osInfo(
    ...options:
      | [OSInfo]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
  ) {
    let osType: string;
    let osVersion: string;
    let osFull: string | undefined;
    let runtimeVersion: string | undefined;
    if (options.length === 4) {
      osType = options[0];
      osVersion = options[1];
      osFull = options[2];
      runtimeVersion = options[3];
    } else if (options.length === 3) {
      osType = options[0];
      osVersion = options[1];
      osFull = options[2];
    } else if (options.length === 2) {
      osType = options[0];
      osVersion = options[1];
    } else {
      osType = options[0].osType;
      osVersion = options[0].osVersion;
      osFull = options[0].osFull;
      runtimeVersion = options[0].runtimeVersion;
    }

    this.fields['host.os.type'] = osType;
    this.fields['host.os.name'] = osType === 'ios' ? 'iOS' : 'Android';
    this.fields['host.os.version'] = osVersion;
    this.fields['host.os.full'] = osFull;
    this.fields['service.runtime.name'] = osType === 'ios' ? 'iOS' : 'Android Runtime';
    this.fields['service.runtime.version'] = runtimeVersion ?? osVersion;
    return this;
  }

  // FIXME  synthtrace shouldn't have side-effects like this. We should use an API like .session() which returns a session
  startNewSession() {
    this.fields['session.id'] = generateLongId();
    return this;
  }

  setNetworkConnection(networkInfo: NetworkConnectionInfo) {
    this.networkConnection = networkInfo;
    return this;
  }

  setGeoInfo(geoInfo: GeoInfo) {
    if (geoInfo) {
      this.fields['client.ip'] = geoInfo.clientIp;
      this.fields['client.geo.city_name'] = geoInfo.cityName;
      this.fields['client.geo.country_name'] = geoInfo.countryName;
      this.fields['client.geo.country_iso_code'] = geoInfo.countryIsoCode;
      this.fields['client.geo.continent_name'] = geoInfo.continentName;
      this.fields['client.geo.region_name'] = geoInfo.regionName;
      this.fields['client.geo.region_iso_code'] = geoInfo.regionIsoCode;
      this.fields['client.geo.location'] = geoInfo.location;
    }

    return this;
  }

  transaction(
    ...options:
      | [{ transactionName: string; frameworkName?: string; frameworkVersion?: string }]
      | [string]
      | [string, string]
      | [string, string, string]
  ) {
    let transactionName: string;
    let frameworkName: string | undefined;
    let frameworkVersion: string | undefined;
    if (options.length === 3) {
      transactionName = options[0];
      frameworkName = options[1];
      frameworkVersion = options[2];
    } else if (options.length === 2) {
      transactionName = options[0];
      frameworkName = options[1];
    } else if (typeof options[0] === 'string') {
      transactionName = options[0];
    } else {
      transactionName = options[0].transactionName;
      frameworkName = options[0].frameworkName;
      frameworkVersion = options[0].frameworkVersion;
    }
    return new Transaction({
      ...this.fields,
      'transaction.name': transactionName,
      'transaction.type': 'mobile',
      'service.framework.name': frameworkName,
      'service.framework.version': frameworkVersion,
    });
  }

  span(...options: [string, string] | [string, string, string] | [SpanParams]) {
    let spanName: string;
    let spanType: string;
    let spanSubtype: string;
    let fields: ApmFields;

    if (options.length === 3 || options.length === 2) {
      spanName = options[0];
      spanType = options[1];
      spanSubtype = options[2] || 'unknown';
      fields = {};
    } else {
      ({ spanName, spanType, spanSubtype = 'unknown', ...fields } = options[0]);
    }

    return new Span({
      ...this.fields,
      ...fields,
      'span.name': spanName,
      'span.type': spanType,
      'span.subtype': spanSubtype,
    });
  }

  httpSpan(
    ...options:
      | [{ spanName: string; httpMethod: string; httpUrl: string }]
      | [string, string, string]
  ) {
    let spanName: string;
    let httpMethod: string;
    let httpUrl: string;
    if (options.length === 3) {
      spanName = options[0];
      httpMethod = options[1];
      httpUrl = options[2];
    } else {
      spanName = options[0].spanName;
      httpMethod = options[0].httpMethod;
      httpUrl = options[0].httpUrl;
    }

    let spanParameters: SpanParams = {
      spanName,
      spanType: 'external',
      spanSubtype: 'http',
      'http.request.method': httpMethod,
      'url.original': httpUrl,
      'transaction.type': 'mobile',
    };

    if (this.networkConnection) {
      spanParameters = {
        ...spanParameters,
        'network.connection.type': this.networkConnection.type,
        'network.connection.subtype': this.networkConnection.subType,
        'network.carrier.name': this.networkConnection.carrierName,
        'network.carrier.mcc': this.networkConnection.carrierMCC,
        'network.carrier.mnc': this.networkConnection.carrierMNC,
        'network.carrier.icc': this.networkConnection.carrierICC,
      };
    }

    return this.span(spanParameters);
  }

  appMetrics(metrics: ApmApplicationMetricFields) {
    return new Metricset<ApmFields>({
      ...this.fields,
      'metricset.name': 'app',
      ...metrics,
    });
  }

  crash({ message, groupingName }: { message: string; groupingName?: string }) {
    return new ApmError({
      ...this.fields,
      'error.type': 'crash',
      'error.exception': [{ message, ...{ type: 'crash' } }],
      'error.grouping_name': groupingName || message,
    });
  }
}
