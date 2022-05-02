export const containerEcs = {
  cpu: {
    usage: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'container-cpu-usage',
      description: 'Percent CPU used which is normalized by the number of CPU cores and it ranges from 0 to 1. Scaling factor: 1000.',
      flat_name: 'container.cpu.usage',
      level: 'extended',
      name: 'cpu.usage',
      normalize: [],
      scaling_factor: 1000,
      short: 'Percent CPU used, between 0 and 1.',
      type: 'scaled_float'
    }
  },
  disk: { read: { bytes: [Object] }, write: { bytes: [Object] } },
  id: {
    dashed_name: 'container-id',
    description: 'Unique container id.',
    flat_name: 'container.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique container id.',
    type: 'keyword'
  },
  image: {
    name: {
      dashed_name: 'container-image-name',
      description: 'Name of the image the container was built on.',
      flat_name: 'container.image.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'image.name',
      normalize: [],
      short: 'Name of the image the container was built on.',
      type: 'keyword'
    },
    tag: {
      dashed_name: 'container-image-tag',
      description: 'Container image tags.',
      flat_name: 'container.image.tag',
      ignore_above: 1024,
      level: 'extended',
      name: 'image.tag',
      normalize: [Array],
      short: 'Container image tags.',
      type: 'keyword'
    }
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
    type: 'object'
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
      type: 'scaled_float'
    }
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
    type: 'keyword'
  },
  network: { egress: { bytes: [Object] }, ingress: { bytes: [Object] } },
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
    type: 'keyword'
  }
}