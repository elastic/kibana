/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const auditbeatFieldMappings = {
  '@timestamp': {
    type: 'date',
  },
  agent: {
    properties: {
      build: {
        properties: {
          original: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      ephemeral_id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      hostname: {
        type: 'alias',
        path: 'agent.name',
      },
      id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      name: {
        type: 'keyword',
        ignore_above: 1024,
      },
      type: {
        type: 'keyword',
        ignore_above: 1024,
      },
      version: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  },
  destination: {
    properties: {
      address: {
        type: 'keyword',
        ignore_above: 1024,
      },
      as: {
        properties: {
          number: {
            type: 'long',
          },
          organization: {
            properties: {
              name: {
                type: 'keyword',
                ignore_above: 1024,
                fields: {
                  text: {
                    type: 'match_only_text',
                  },
                },
              },
            },
          },
        },
      },
      bytes: {
        type: 'long',
      },
      domain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      geo: {
        properties: {
          city_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          continent_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          continent_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          country_iso_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          country_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          location: {
            type: 'geo_point',
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          postal_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          region_iso_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          region_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          timezone: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      ip: {
        type: 'ip',
      },
      mac: {
        type: 'keyword',
        ignore_above: 1024,
      },
      nat: {
        properties: {
          ip: {
            type: 'ip',
          },
          port: {
            type: 'long',
          },
        },
      },
      packets: {
        type: 'long',
      },
      path: {
        type: 'keyword',
        ignore_above: 1024,
      },
      port: {
        type: 'long',
      },
      registered_domain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      subdomain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      top_level_domain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      user: {
        properties: {
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          email: {
            type: 'keyword',
            ignore_above: 1024,
          },
          full_name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          group: {
            properties: {
              domain: {
                type: 'keyword',
                ignore_above: 1024,
              },
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          hash: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          roles: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  ecs: {
    properties: {
      version: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  },
  event: {
    properties: {
      action: {
        type: 'keyword',
        ignore_above: 1024,
      },
      agent_id_status: {
        type: 'keyword',
        ignore_above: 1024,
      },
      category: {
        type: 'keyword',
        ignore_above: 1024,
      },
      code: {
        type: 'keyword',
        ignore_above: 1024,
      },
      created: {
        type: 'date',
      },
      dataset: {
        type: 'keyword',
        ignore_above: 1024,
      },
      duration: {
        type: 'long',
      },
      end: {
        type: 'date',
      },
      hash: {
        type: 'keyword',
        ignore_above: 1024,
      },
      id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      ingested: {
        type: 'date',
      },
      kind: {
        type: 'keyword',
        ignore_above: 1024,
      },
      module: {
        type: 'keyword',
        ignore_above: 1024,
      },
      origin: {
        type: 'keyword',
        ignore_above: 1024,
      },
      original: {
        type: 'keyword',
        index: false,
        doc_values: false,
        ignore_above: 1024,
      },
      outcome: {
        type: 'keyword',
        ignore_above: 1024,
      },
      provider: {
        type: 'keyword',
        ignore_above: 1024,
      },
      reason: {
        type: 'keyword',
        ignore_above: 1024,
      },
      reference: {
        type: 'keyword',
        ignore_above: 1024,
      },
      risk_score: {
        type: 'float',
      },
      risk_score_norm: {
        type: 'float',
      },
      sequence: {
        type: 'long',
      },
      severity: {
        type: 'long',
      },
      start: {
        type: 'date',
      },
      timezone: {
        type: 'keyword',
        ignore_above: 1024,
      },
      type: {
        type: 'keyword',
        ignore_above: 1024,
      },
      url: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  },
  host: {
    properties: {
      architecture: {
        type: 'keyword',
        ignore_above: 1024,
      },
      containerized: {
        type: 'boolean',
      },
      cpu: {
        properties: {
          usage: {
            type: 'scaled_float',
            scaling_factor: 1000.0,
          },
        },
      },
      disk: {
        properties: {
          read: {
            properties: {
              bytes: {
                type: 'long',
              },
            },
          },
          write: {
            properties: {
              bytes: {
                type: 'long',
              },
            },
          },
        },
      },
      domain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      geo: {
        properties: {
          city_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          continent_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          continent_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          country_iso_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          country_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          location: {
            type: 'geo_point',
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          postal_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          region_iso_code: {
            type: 'keyword',
            ignore_above: 1024,
          },
          region_name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          timezone: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      hostname: {
        type: 'keyword',
        ignore_above: 1024,
      },
      id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      ip: {
        type: 'ip',
      },
      mac: {
        type: 'keyword',
        ignore_above: 1024,
      },
      name: {
        type: 'keyword',
        ignore_above: 1024,
      },
      network: {
        properties: {
          egress: {
            properties: {
              bytes: {
                type: 'long',
              },
              packets: {
                type: 'long',
              },
            },
          },
          ingress: {
            properties: {
              bytes: {
                type: 'long',
              },
              packets: {
                type: 'long',
              },
            },
          },
        },
      },
      os: {
        properties: {
          build: {
            type: 'keyword',
            ignore_above: 1024,
          },
          codename: {
            type: 'keyword',
            ignore_above: 1024,
          },
          family: {
            type: 'keyword',
            ignore_above: 1024,
          },
          full: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          kernel: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          platform: {
            type: 'keyword',
            ignore_above: 1024,
          },
          type: {
            type: 'keyword',
            ignore_above: 1024,
          },
          version: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      type: {
        type: 'keyword',
        ignore_above: 1024,
      },
      uptime: {
        type: 'long',
      },
    },
  },
  message: {
    type: 'match_only_text',
  },
  service: {
    properties: {
      address: {
        type: 'keyword',
        ignore_above: 1024,
      },
      environment: {
        type: 'keyword',
        ignore_above: 1024,
      },
      ephemeral_id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      name: {
        type: 'keyword',
        ignore_above: 1024,
      },
      node: {
        properties: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      origin: {
        properties: {
          address: {
            type: 'keyword',
            ignore_above: 1024,
          },
          environment: {
            type: 'keyword',
            ignore_above: 1024,
          },
          ephemeral_id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          node: {
            properties: {
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          state: {
            type: 'keyword',
            ignore_above: 1024,
          },
          type: {
            type: 'keyword',
            ignore_above: 1024,
          },
          version: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      state: {
        type: 'keyword',
        ignore_above: 1024,
      },
      target: {
        properties: {
          address: {
            type: 'keyword',
            ignore_above: 1024,
          },
          environment: {
            type: 'keyword',
            ignore_above: 1024,
          },
          ephemeral_id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
          node: {
            properties: {
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          state: {
            type: 'keyword',
            ignore_above: 1024,
          },
          type: {
            type: 'keyword',
            ignore_above: 1024,
          },
          version: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      type: {
        type: 'keyword',
        ignore_above: 1024,
      },
      version: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  },
  user: {
    properties: {
      audit: {
        properties: {
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      changes: {
        properties: {
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          email: {
            type: 'keyword',
            ignore_above: 1024,
          },
          full_name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          group: {
            properties: {
              domain: {
                type: 'keyword',
                ignore_above: 1024,
              },
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          hash: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          roles: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      domain: {
        type: 'keyword',
        ignore_above: 1024,
      },
      effective: {
        properties: {
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          email: {
            type: 'keyword',
            ignore_above: 1024,
          },
          full_name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          group: {
            properties: {
              domain: {
                type: 'keyword',
                ignore_above: 1024,
              },
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          hash: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          roles: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      email: {
        type: 'keyword',
        ignore_above: 1024,
      },
      entity_id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      filesystem: {
        properties: {
          group: {
            properties: {
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      full_name: {
        type: 'keyword',
        ignore_above: 1024,
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
      group: {
        properties: {
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      hash: {
        type: 'keyword',
        ignore_above: 1024,
      },
      id: {
        type: 'keyword',
        ignore_above: 1024,
      },
      name: {
        type: 'keyword',
        ignore_above: 1024,
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
      roles: {
        type: 'keyword',
        ignore_above: 1024,
      },
      saved: {
        properties: {
          group: {
            properties: {
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      selinux: {
        properties: {
          category: {
            type: 'keyword',
            ignore_above: 1024,
          },
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          level: {
            type: 'keyword',
            ignore_above: 1024,
          },
          role: {
            type: 'keyword',
            ignore_above: 1024,
          },
          user: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      target: {
        properties: {
          domain: {
            type: 'keyword',
            ignore_above: 1024,
          },
          email: {
            type: 'keyword',
            ignore_above: 1024,
          },
          full_name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          group: {
            properties: {
              domain: {
                type: 'keyword',
                ignore_above: 1024,
              },
              id: {
                type: 'keyword',
                ignore_above: 1024,
              },
              name: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
          hash: {
            type: 'keyword',
            ignore_above: 1024,
          },
          id: {
            type: 'keyword',
            ignore_above: 1024,
          },
          name: {
            type: 'keyword',
            ignore_above: 1024,
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
          roles: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      terminal: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  },
};
