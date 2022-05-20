/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
export const cloudEcs = {
  account: {
    id: {
      dashed_name: 'cloud-account-id',
      description: 'The cloud account or organization id used to identify different entities in a multi-tenant environment.\n' +
        'Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
      example: 666777888999,
      flat_name: 'cloud.account.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'account.id',
      normalize: [],
      short: 'The cloud account or organization id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'cloud-account-name',
      description: 'The cloud account name or alias used to identify different entities in a multi-tenant environment.\n' +
        'Examples: AWS account name, Google Cloud ORG display name.',
      example: 'elastic-dev',
      flat_name: 'cloud.account.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'account.name',
      normalize: [],
      short: 'The cloud account name.',
      type: 'keyword'
    }
  },
  availability_zone: {
    dashed_name: 'cloud-availability-zone',
    description: 'Availability zone in which this host, resource, or service is located.',
    example: 'us-east-1c',
    flat_name: 'cloud.availability_zone',
    ignore_above: 1024,
    level: 'extended',
    name: 'availability_zone',
    normalize: [],
    short: 'Availability zone in which this host, resource, or service is located.',
    type: 'keyword'
  },
  instance: {
    id: {
      dashed_name: 'cloud-instance-id',
      description: 'Instance ID of the host machine.',
      example: 'i-1234567890abcdef0',
      flat_name: 'cloud.instance.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'instance.id',
      normalize: [],
      short: 'Instance ID of the host machine.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'cloud-instance-name',
      description: 'Instance name of the host machine.',
      flat_name: 'cloud.instance.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'instance.name',
      normalize: [],
      short: 'Instance name of the host machine.',
      type: 'keyword'
    }
  },
  machine: {
    type: {
      dashed_name: 'cloud-machine-type',
      description: 'Machine type of the host machine.',
      example: 't2.medium',
      flat_name: 'cloud.machine.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'machine.type',
      normalize: [],
      short: 'Machine type of the host machine.',
      type: 'keyword'
    }
  },
  origin: {
    account: {
      id: {
        dashed_name: 'cloud-origin-account-id',
        description: 'The cloud account or organization id used to identify different entities in a multi-tenant environment.\n' +
          'Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
        example: 666777888999,
        flat_name: 'cloud.origin.account.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'account.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud account or organization id.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-origin-account-name',
        description: 'The cloud account name or alias used to identify different entities in a multi-tenant environment.\n' +
          'Examples: AWS account name, Google Cloud ORG display name.',
        example: 'elastic-dev',
        flat_name: 'cloud.origin.account.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'account.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud account name.',
        type: 'keyword'
      }
    },
    availability_zone: {
      dashed_name: 'cloud-origin-availability-zone',
      description: 'Availability zone in which this host, resource, or service is located.',
      example: 'us-east-1c',
      flat_name: 'cloud.origin.availability_zone',
      ignore_above: 1024,
      level: 'extended',
      name: 'availability_zone',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Availability zone in which this host, resource, or service is located.',
      type: 'keyword'
    },
    instance: {
      id: {
        dashed_name: 'cloud-origin-instance-id',
        description: 'Instance ID of the host machine.',
        example: 'i-1234567890abcdef0',
        flat_name: 'cloud.origin.instance.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'instance.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Instance ID of the host machine.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-origin-instance-name',
        description: 'Instance name of the host machine.',
        flat_name: 'cloud.origin.instance.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'instance.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Instance name of the host machine.',
        type: 'keyword'
      }
    },
    machine: {
      type: {
        dashed_name: 'cloud-origin-machine-type',
        description: 'Machine type of the host machine.',
        example: 't2.medium',
        flat_name: 'cloud.origin.machine.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'machine.type',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Machine type of the host machine.',
        type: 'keyword'
      }
    },
    project: {
      id: {
        dashed_name: 'cloud-origin-project-id',
        description: 'The cloud project identifier.\n' +
          'Examples: Google Cloud Project id, Azure Project id.',
        example: 'my-project',
        flat_name: 'cloud.origin.project.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'project.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud project id.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-origin-project-name',
        description: 'The cloud project name.\n' +
          'Examples: Google Cloud Project name, Azure Project name.',
        example: 'my project',
        flat_name: 'cloud.origin.project.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'project.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud project name.',
        type: 'keyword'
      }
    },
    provider: {
      dashed_name: 'cloud-origin-provider',
      description: 'Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean.',
      example: 'aws',
      flat_name: 'cloud.origin.provider',
      ignore_above: 1024,
      level: 'extended',
      name: 'provider',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Name of the cloud provider.',
      type: 'keyword'
    },
    region: {
      dashed_name: 'cloud-origin-region',
      description: 'Region in which this host, resource, or service is located.',
      example: 'us-east-1',
      flat_name: 'cloud.origin.region',
      ignore_above: 1024,
      level: 'extended',
      name: 'region',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Region in which this host, resource, or service is located.',
      type: 'keyword'
    },
    service: {
      name: {
        dashed_name: 'cloud-origin-service-name',
        description: 'The cloud service name is intended to distinguish services running on different platforms within a provider, eg AWS EC2 vs Lambda, GCP GCE vs App Engine, Azure VM vs App Server.\n' +
          'Examples: app engine, app service, cloud run, fargate, lambda.',
        example: 'lambda',
        flat_name: 'cloud.origin.service.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'service.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud service name.',
        type: 'keyword'
      }
    }
  },
  project: {
    id: {
      dashed_name: 'cloud-project-id',
      description: 'The cloud project identifier.\n' +
        'Examples: Google Cloud Project id, Azure Project id.',
      example: 'my-project',
      flat_name: 'cloud.project.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'project.id',
      normalize: [],
      short: 'The cloud project id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'cloud-project-name',
      description: 'The cloud project name.\n' +
        'Examples: Google Cloud Project name, Azure Project name.',
      example: 'my project',
      flat_name: 'cloud.project.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'project.name',
      normalize: [],
      short: 'The cloud project name.',
      type: 'keyword'
    }
  },
  provider: {
    dashed_name: 'cloud-provider',
    description: 'Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean.',
    example: 'aws',
    flat_name: 'cloud.provider',
    ignore_above: 1024,
    level: 'extended',
    name: 'provider',
    normalize: [],
    short: 'Name of the cloud provider.',
    type: 'keyword'
  },
  region: {
    dashed_name: 'cloud-region',
    description: 'Region in which this host, resource, or service is located.',
    example: 'us-east-1',
    flat_name: 'cloud.region',
    ignore_above: 1024,
    level: 'extended',
    name: 'region',
    normalize: [],
    short: 'Region in which this host, resource, or service is located.',
    type: 'keyword'
  },
  service: {
    name: {
      dashed_name: 'cloud-service-name',
      description: 'The cloud service name is intended to distinguish services running on different platforms within a provider, eg AWS EC2 vs Lambda, GCP GCE vs App Engine, Azure VM vs App Server.\n' +
        'Examples: app engine, app service, cloud run, fargate, lambda.',
      example: 'lambda',
      flat_name: 'cloud.service.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'service.name',
      normalize: [],
      short: 'The cloud service name.',
      type: 'keyword'
    }
  },
  target: {
    account: {
      id: {
        dashed_name: 'cloud-target-account-id',
        description: 'The cloud account or organization id used to identify different entities in a multi-tenant environment.\n' +
          'Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
        example: 666777888999,
        flat_name: 'cloud.target.account.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'account.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud account or organization id.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-target-account-name',
        description: 'The cloud account name or alias used to identify different entities in a multi-tenant environment.\n' +
          'Examples: AWS account name, Google Cloud ORG display name.',
        example: 'elastic-dev',
        flat_name: 'cloud.target.account.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'account.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud account name.',
        type: 'keyword'
      }
    },
    availability_zone: {
      dashed_name: 'cloud-target-availability-zone',
      description: 'Availability zone in which this host, resource, or service is located.',
      example: 'us-east-1c',
      flat_name: 'cloud.target.availability_zone',
      ignore_above: 1024,
      level: 'extended',
      name: 'availability_zone',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Availability zone in which this host, resource, or service is located.',
      type: 'keyword'
    },
    instance: {
      id: {
        dashed_name: 'cloud-target-instance-id',
        description: 'Instance ID of the host machine.',
        example: 'i-1234567890abcdef0',
        flat_name: 'cloud.target.instance.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'instance.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Instance ID of the host machine.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-target-instance-name',
        description: 'Instance name of the host machine.',
        flat_name: 'cloud.target.instance.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'instance.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Instance name of the host machine.',
        type: 'keyword'
      }
    },
    machine: {
      type: {
        dashed_name: 'cloud-target-machine-type',
        description: 'Machine type of the host machine.',
        example: 't2.medium',
        flat_name: 'cloud.target.machine.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'machine.type',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'Machine type of the host machine.',
        type: 'keyword'
      }
    },
    project: {
      id: {
        dashed_name: 'cloud-target-project-id',
        description: 'The cloud project identifier.\n' +
          'Examples: Google Cloud Project id, Azure Project id.',
        example: 'my-project',
        flat_name: 'cloud.target.project.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'project.id',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud project id.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'cloud-target-project-name',
        description: 'The cloud project name.\n' +
          'Examples: Google Cloud Project name, Azure Project name.',
        example: 'my project',
        flat_name: 'cloud.target.project.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'project.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud project name.',
        type: 'keyword'
      }
    },
    provider: {
      dashed_name: 'cloud-target-provider',
      description: 'Name of the cloud provider. Example values are aws, azure, gcp, or digitalocean.',
      example: 'aws',
      flat_name: 'cloud.target.provider',
      ignore_above: 1024,
      level: 'extended',
      name: 'provider',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Name of the cloud provider.',
      type: 'keyword'
    },
    region: {
      dashed_name: 'cloud-target-region',
      description: 'Region in which this host, resource, or service is located.',
      example: 'us-east-1',
      flat_name: 'cloud.target.region',
      ignore_above: 1024,
      level: 'extended',
      name: 'region',
      normalize: [],
      original_fieldset: 'cloud',
      short: 'Region in which this host, resource, or service is located.',
      type: 'keyword'
    },
    service: {
      name: {
        dashed_name: 'cloud-target-service-name',
        description: 'The cloud service name is intended to distinguish services running on different platforms within a provider, eg AWS EC2 vs Lambda, GCP GCE vs App Engine, Azure VM vs App Server.\n' +
          'Examples: app engine, app service, cloud run, fargate, lambda.',
        example: 'lambda',
        flat_name: 'cloud.target.service.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'service.name',
        normalize: [],
        original_fieldset: 'cloud',
        short: 'The cloud service name.',
        type: 'keyword'
      }
    }
  }
}