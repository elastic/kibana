/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const containerEcs = {
  cpu: {
    usage: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'container-cpu-usage',
      description:
        'Percent CPU used which is normalized by the number of CPU cores and it ranges from 0 to 1. Scaling factor: 1000.',
      flat_name: 'container.cpu.usage',
      level: 'extended',
      name: 'cpu.usage',
      normalize: [],
      scaling_factor: 1000,
      short: 'Percent CPU used, between 0 and 1.',
      type: 'scaled_float',
    },
  },
  disk: {
    read: {
      bytes: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'container-disk-read-bytes',
        description:
          'The total number of bytes (gauge) read successfully (aggregated from all disks) since the last metric collection.',
        flat_name: 'container.disk.read.bytes',
        level: 'extended',
        name: 'disk.read.bytes',
        normalize: [],
        short: 'The number of bytes read by all disks.',
        type: 'long',
      },
    },
    write: {
      bytes: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'container-disk-write-bytes',
        description:
          'The total number of bytes (gauge) written successfully (aggregated from all disks) since the last metric collection.',
        flat_name: 'container.disk.write.bytes',
        level: 'extended',
        name: 'disk.write.bytes',
        normalize: [],
        short: 'The number of bytes written on all disks.',
        type: 'long',
      },
    },
  },
  id: {
    dashed_name: 'container-id',
    description: 'Unique container id.',
    flat_name: 'container.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique container id.',
    type: 'keyword',
  },
  image: {
    hash: {
      all: {
        dashed_name: 'container-image-hash-all',
        description:
          'An array of digests of the image the container was built on. Each digest consists of the hash algorithm and value in this format: `algorithm:value`. Algorithm names should align with the field names in the ECS hash field set.',
        example: '[sha256:f8fefc80e3273dc756f288a63945820d6476ad64883892c771b5e2ece6bf1b26]',
        flat_name: 'container.image.hash.all',
        ignore_above: 1024,
        level: 'extended',
        name: 'image.hash.all',
        normalize: ['array'],
        short: 'An array of digests of the image the container was built on.',
        type: 'keyword',
      },
    },
    name: {
      dashed_name: 'container-image-name',
      description: 'Name of the image the container was built on.',
      flat_name: 'container.image.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'image.name',
      normalize: [],
      short: 'Name of the image the container was built on.',
      type: 'keyword',
    },
    tag: {
      dashed_name: 'container-image-tag',
      description: 'Container image tags.',
      flat_name: 'container.image.tag',
      ignore_above: 1024,
      level: 'extended',
      name: 'image.tag',
      normalize: ['array'],
      short: 'Container image tags.',
      type: 'keyword',
    },
  },
  labels: {
    dashed_name: 'container-labels',
    description: 'Image labels.',
    flat_name: 'container.labels',
    level: 'extended',
    name: 'labels',
    normalize: [],
    object_type: 'keyword',
    short: 'Image labels.',
    type: 'object',
  },
  memory: {
    usage: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'container-memory-usage',
      description: 'Memory usage percentage and it ranges from 0 to 1. Scaling factor: 1000.',
      flat_name: 'container.memory.usage',
      level: 'extended',
      name: 'memory.usage',
      normalize: [],
      scaling_factor: 1000,
      short: 'Percent memory used, between 0 and 1.',
      type: 'scaled_float',
    },
  },
  name: {
    dashed_name: 'container-name',
    description: 'Container name.',
    flat_name: 'container.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Container name.',
    type: 'keyword',
  },
  network: {
    egress: {
      bytes: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'container-network-egress-bytes',
        description:
          'The number of bytes (gauge) sent out on all network interfaces by the container since the last metric collection.',
        flat_name: 'container.network.egress.bytes',
        level: 'extended',
        name: 'network.egress.bytes',
        normalize: [],
        short: 'The number of bytes sent on all network interfaces.',
        type: 'long',
      },
    },
    ingress: {
      bytes: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'container-network-ingress-bytes',
        description:
          'The number of bytes received (gauge) on all network interfaces by the container since the last metric collection.',
        flat_name: 'container.network.ingress.bytes',
        level: 'extended',
        name: 'network.ingress.bytes',
        normalize: [],
        short: 'The number of bytes received on all network interfaces.',
        type: 'long',
      },
    },
  },
  runtime: {
    dashed_name: 'container-runtime',
    description: 'Runtime managing this container.',
    example: 'docker',
    flat_name: 'container.runtime',
    ignore_above: 1024,
    level: 'extended',
    name: 'runtime',
    normalize: [],
    short: 'Runtime managing this container.',
    type: 'keyword',
  },
};
