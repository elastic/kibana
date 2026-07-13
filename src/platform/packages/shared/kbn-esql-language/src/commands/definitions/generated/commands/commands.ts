/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file is auto-generated. Do not edit it manually.

export const commandsMetadata: Record<string, unknown> = {
  change_point: {
    type: 'command',
    name: 'change_point',
    license: 'platinum',
    observability_tier: 'COMPLETE',
  },
  dedup: {
    type: 'command',
    name: 'dedup',
  },
  dissect: {
    type: 'command',
    name: 'dissect',
  },
  drop: {
    type: 'command',
    name: 'drop',
  },
  enrich: {
    type: 'command',
    name: 'enrich',
  },
  eval: {
    type: 'command',
    name: 'eval',
  },
  explain: {
    type: 'command',
    name: 'explain',
  },
  fork: {
    type: 'command',
    name: 'fork',
  },
  grok: {
    type: 'command',
    name: 'grok',
  },
  highlight: {
    type: 'command',
    name: 'highlight',
  },
  inline_stats: {
    type: 'command',
    name: 'inline_stats',
  },
  insist: {
    type: 'command',
    name: 'insist',
  },
  ip_location: {
    type: 'command',
    name: 'ip_location',
    output: {
      vary_by: 'database_file',
      selected_by: 'properties',
      variants: {
        '*-City.mmdb': {
          accuracy_radius: {
            type: 'integer',
            default: false,
          },
          city_name: {
            type: 'keyword',
          },
          continent_code: {
            type: 'keyword',
            default: false,
          },
          continent_name: {
            type: 'keyword',
          },
          country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          country_iso_code: {
            type: 'keyword',
          },
          country_name: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          location: {
            type: 'geo_point',
          },
          postal_code: {
            type: 'keyword',
            default: false,
          },
          region_iso_code: {
            type: 'keyword',
          },
          region_name: {
            type: 'keyword',
          },
          registered_country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          registered_country_iso_code: {
            type: 'keyword',
            default: false,
          },
          registered_country_name: {
            type: 'keyword',
            default: false,
          },
          timezone: {
            type: 'keyword',
            default: false,
          },
        },
        '*-Country.mmdb': {
          continent_code: {
            type: 'keyword',
            default: false,
          },
          continent_name: {
            type: 'keyword',
          },
          country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          country_iso_code: {
            type: 'keyword',
          },
          country_name: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          registered_country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          registered_country_iso_code: {
            type: 'keyword',
            default: false,
          },
          registered_country_name: {
            type: 'keyword',
            default: false,
          },
        },
        '*-ASN.mmdb': {
          asn: {
            type: 'long',
          },
          ip: {
            type: 'keyword',
          },
          network: {
            type: 'keyword',
          },
          organization_name: {
            type: 'keyword',
          },
        },
        '*-Anonymous-IP.mmdb': {
          anonymous: {
            type: 'boolean',
          },
          anonymous_vpn: {
            type: 'boolean',
          },
          hosting_provider: {
            type: 'boolean',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          public_proxy: {
            type: 'boolean',
          },
          residential_proxy: {
            type: 'boolean',
          },
          tor_exit_node: {
            type: 'boolean',
          },
        },
        '*-Connection-Type.mmdb': {
          connection_type: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
        },
        '*-Domain.mmdb': {
          domain: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
        },
        '*-Enterprise.mmdb': {
          accuracy_radius: {
            type: 'integer',
            default: false,
          },
          anonymous: {
            type: 'boolean',
            default: false,
          },
          anonymous_vpn: {
            type: 'boolean',
            default: false,
          },
          asn: {
            type: 'long',
            default: false,
          },
          city_confidence: {
            type: 'integer',
            default: false,
          },
          city_name: {
            type: 'keyword',
          },
          connection_type: {
            type: 'keyword',
            default: false,
          },
          continent_code: {
            type: 'keyword',
            default: false,
          },
          continent_name: {
            type: 'keyword',
          },
          country_confidence: {
            type: 'integer',
            default: false,
          },
          country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          country_iso_code: {
            type: 'keyword',
          },
          country_name: {
            type: 'keyword',
          },
          domain: {
            type: 'keyword',
            default: false,
          },
          hosting_provider: {
            type: 'boolean',
            default: false,
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          isp: {
            type: 'keyword',
            default: false,
          },
          isp_organization_name: {
            type: 'keyword',
            default: false,
          },
          location: {
            type: 'geo_point',
          },
          mobile_country_code: {
            type: 'keyword',
            default: false,
          },
          mobile_network_code: {
            type: 'keyword',
            default: false,
          },
          network: {
            type: 'keyword',
            default: false,
          },
          organization_name: {
            type: 'keyword',
            default: false,
          },
          postal_code: {
            type: 'keyword',
            default: false,
          },
          postal_confidence: {
            type: 'integer',
            default: false,
          },
          public_proxy: {
            type: 'boolean',
            default: false,
          },
          region_iso_code: {
            type: 'keyword',
          },
          region_name: {
            type: 'keyword',
          },
          registered_country_in_european_union: {
            type: 'boolean',
            default: false,
          },
          registered_country_iso_code: {
            type: 'keyword',
            default: false,
          },
          registered_country_name: {
            type: 'keyword',
            default: false,
          },
          residential_proxy: {
            type: 'boolean',
            default: false,
          },
          timezone: {
            type: 'keyword',
            default: false,
          },
          tor_exit_node: {
            type: 'boolean',
            default: false,
          },
          user_type: {
            type: 'keyword',
            default: false,
          },
        },
        '*-ISP.mmdb': {
          asn: {
            type: 'long',
          },
          ip: {
            type: 'keyword',
          },
          isp: {
            type: 'keyword',
          },
          isp_organization_name: {
            type: 'keyword',
          },
          mobile_country_code: {
            type: 'keyword',
          },
          mobile_network_code: {
            type: 'keyword',
          },
          network: {
            type: 'keyword',
          },
          organization_name: {
            type: 'keyword',
          },
        },
        'ipinfo*plus*.mmdb': {
          accuracy_radius: {
            type: 'integer',
            default: false,
          },
          anonymous: {
            type: 'boolean',
            default: false,
          },
          anycast: {
            type: 'boolean',
            default: false,
          },
          asn: {
            type: 'long',
            default: false,
          },
          asn_changed_date: {
            type: 'keyword',
            default: false,
          },
          city_name: {
            type: 'keyword',
          },
          continent_code: {
            type: 'keyword',
            default: false,
          },
          continent_name: {
            type: 'keyword',
          },
          country_iso_code: {
            type: 'keyword',
          },
          country_name: {
            type: 'keyword',
          },
          dma_code: {
            type: 'keyword',
            default: false,
          },
          domain: {
            type: 'keyword',
            default: false,
          },
          geo_changed_date: {
            type: 'keyword',
            default: false,
          },
          geoname_id: {
            type: 'keyword',
            default: false,
          },
          hosting: {
            type: 'boolean',
            default: false,
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          isp: {
            type: 'keyword',
            default: false,
          },
          location: {
            type: 'geo_point',
          },
          mobile: {
            type: 'boolean',
            default: false,
          },
          mobile_country_code: {
            type: 'keyword',
            default: false,
          },
          mobile_network_code: {
            type: 'keyword',
            default: false,
          },
          network: {
            type: 'keyword',
            default: false,
          },
          organization_name: {
            type: 'keyword',
            default: false,
          },
          postal_code: {
            type: 'keyword',
            default: false,
          },
          proxy: {
            type: 'boolean',
            default: false,
          },
          region_iso_code: {
            type: 'keyword',
          },
          region_name: {
            type: 'keyword',
          },
          relay: {
            type: 'boolean',
            default: false,
          },
          satellite: {
            type: 'boolean',
            default: false,
          },
          service: {
            type: 'keyword',
            default: false,
          },
          timezone: {
            type: 'keyword',
            default: false,
          },
          tor: {
            type: 'boolean',
            default: false,
          },
          type: {
            type: 'keyword',
            default: false,
          },
          vpn: {
            type: 'boolean',
            default: false,
          },
        },
        'ipinfo*asn*.mmdb': {
          asn: {
            type: 'long',
          },
          country_iso_code: {
            type: 'keyword',
            default: false,
          },
          domain: {
            type: 'keyword',
            default: false,
          },
          ip: {
            type: 'keyword',
          },
          network: {
            type: 'keyword',
          },
          organization_name: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
            default: false,
          },
        },
        'ipinfo*country*.mmdb': {
          continent_code: {
            type: 'keyword',
            default: false,
          },
          continent_name: {
            type: 'keyword',
          },
          country_iso_code: {
            type: 'keyword',
          },
          country_name: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
        },
        'ipinfo*location*.mmdb': {
          city_name: {
            type: 'keyword',
          },
          country_iso_code: {
            type: 'keyword',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          location: {
            type: 'geo_point',
          },
          postal_code: {
            type: 'keyword',
            default: false,
          },
          region_name: {
            type: 'keyword',
          },
          timezone: {
            type: 'keyword',
            default: false,
          },
        },
        'ipinfo*privacy*.mmdb': {
          hosting: {
            type: 'boolean',
          },
          ip: {
            type: 'keyword',
            default: false,
          },
          proxy: {
            type: 'boolean',
          },
          relay: {
            type: 'boolean',
          },
          service: {
            type: 'keyword',
          },
          tor: {
            type: 'boolean',
          },
          vpn: {
            type: 'boolean',
          },
        },
      },
    },
  },
  keep: {
    type: 'command',
    name: 'keep',
  },
  limit: {
    type: 'command',
    name: 'limit',
  },
  lookup: {
    type: 'command',
    name: 'lookup',
  },
  lookup_join: {
    type: 'command',
    name: 'lookup_join',
  },
  metrics_info: {
    type: 'command',
    name: 'metrics_info',
  },
  mmr: {
    type: 'command',
    name: 'mmr',
  },
  mv_expand: {
    type: 'command',
    name: 'mv_expand',
  },
  registered_domain: {
    type: 'command',
    name: 'registered_domain',
    output: {
      vary_by: 'none',
      variants: {
        all: {
          domain: {
            type: 'keyword',
          },
          registered_domain: {
            type: 'keyword',
          },
          subdomain: {
            type: 'keyword',
          },
          top_level_domain: {
            type: 'keyword',
          },
        },
      },
    },
  },
  rename: {
    type: 'command',
    name: 'rename',
  },
  rerank: {
    type: 'command',
    name: 'rerank',
  },
  sample: {
    type: 'command',
    name: 'sample',
  },
  sort: {
    type: 'command',
    name: 'sort',
  },
  stats: {
    type: 'command',
    name: 'stats',
  },
  ts_info: {
    type: 'command',
    name: 'ts_info',
  },
  uri_parts: {
    type: 'command',
    name: 'uri_parts',
    output: {
      vary_by: 'none',
      variants: {
        all: {
          domain: {
            type: 'keyword',
          },
          extension: {
            type: 'keyword',
          },
          fragment: {
            type: 'keyword',
          },
          password: {
            type: 'keyword',
          },
          path: {
            type: 'keyword',
          },
          port: {
            type: 'integer',
          },
          query: {
            type: 'keyword',
          },
          scheme: {
            type: 'keyword',
          },
          user_info: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
        },
      },
    },
  },
  user_agent: {
    type: 'command',
    name: 'user_agent',
    output: {
      vary_by: 'none',
      variants: {
        all: {
          'device.name': {
            type: 'keyword',
          },
          'device.type': {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          'os.full': {
            type: 'keyword',
          },
          'os.name': {
            type: 'keyword',
          },
          'os.version': {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
  },
  where: {
    type: 'command',
    name: 'where',
  },
};

export enum EsqlCommandNames {
  CHANGE_POINT = 'change_point',
  DEDUP = 'dedup',
  DISSECT = 'dissect',
  DROP = 'drop',
  ENRICH = 'enrich',
  EVAL = 'eval',
  EXPLAIN = 'explain',
  FORK = 'fork',
  GROK = 'grok',
  HIGHLIGHT = 'highlight',
  INLINE_STATS = 'inline_stats',
  INSIST = 'insist',
  IP_LOCATION = 'ip_location',
  KEEP = 'keep',
  LIMIT = 'limit',
  LOOKUP = 'lookup',
  LOOKUP_JOIN = 'lookup_join',
  METRICS_INFO = 'metrics_info',
  MMR = 'mmr',
  MV_EXPAND = 'mv_expand',
  REGISTERED_DOMAIN = 'registered_domain',
  RENAME = 'rename',
  RERANK = 'rerank',
  SAMPLE = 'sample',
  SORT = 'sort',
  STATS = 'stats',
  TS_INFO = 'ts_info',
  URI_PARTS = 'uri_parts',
  USER_AGENT = 'user_agent',
  WHERE = 'where',
}
