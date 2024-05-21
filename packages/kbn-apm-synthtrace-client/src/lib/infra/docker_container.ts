/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { Entity, Fields } from '../entity';
import { Serializable } from '../serializable';

interface DockerContainerDocument extends Fields {
  'container.id': string;
  'metricset.name'?: string;
}

export class DockerContainer extends Entity<DockerContainerDocument> {
  metrics() {
    return new DockerContainerMetrics({
      ...this.fields,
      'docker.cpu.total.pct': 25,
      'docker.memory.usage.pct': 20,
    });
  }
}

export interface DockerContainerMetricsDocument extends DockerContainerDocument {
  'docker.cpu.total.pct': number;
  'docker.memory.usage.pct': number;
}

class DockerContainerMetrics extends Serializable<DockerContainerMetricsDocument> {}

export function dockerContainer(id: string): DockerContainer {
  return new DockerContainer({
    'container.id': id,
  });
}
