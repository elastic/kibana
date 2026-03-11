/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { UnifiedDocViewerStorybookArgs } from '../../../.storybook/preview';
import errorApmOtelFixture from '../../__fixtures__/error_apm_otel.json';
import otelExampleFixture from '../../__fixtures__/log_otel_example.json';
import k8sContainerLogFixture from '../../__fixtures__/log_k8s_filebeat.json';
import errorApmWithCulprit from '../../__fixtures__/error_apm_with_culprit.json';
import exceptionUprocessedOtel from '../../__fixtures__/exception_unprocessed_otel.json';
import { LogsOverview, type LogsOverviewProps } from './logs_overview';

type Args = UnifiedDocViewerStorybookArgs<LogsOverviewProps>;
const meta = {
  title: 'Logs overview',
  component: LogsOverview,
} satisfies Meta<typeof LogsOverview>;
export default meta;
type Story = StoryObj<Args>;

/**
 * Just a document with a timestamp.
 */
export const Minimal: Story = {
  name: 'Minimal log',
  args: {
    hit: { fields: { '@timestamp': new Date().toISOString() } },
  },
  tags: ['log'],
};

/**
 * A proxy access event from the OpenTelemetry demo. Has `body.text` as the message and no severity.
 * The `event_name` is `proxy.access`, a custom event defined by that application.
 */
export const OtelExampleEvent: Story = {
  name: 'Custom OpenTelemetry event',
  args: {
    hit: otelExampleFixture,
  },
  tags: ['otel', 'log', 'event'],
};

/**
 * An OpenTelemetry exception event, with APM error attributes added by the elasticapmprocessor.
 * Has `event_name:exception` and both OpenTelemetry `exception.*` attributes and APM `error.*` attributes.
 */
export const ApmErrorOtelExample: Story = {
  name: 'OpenTelemetry exception event as APM Error',
  args: {
    hit: errorApmOtelFixture,
  },
  tags: ['apm', 'otel', 'log', 'error', 'exception', 'event'],
};

/**
 * APM error with processor.event: error and culprit
 */
export const APMErrorExample: Story = {
  name: 'APM Error',
  args: {
    hit: errorApmWithCulprit,
  },
  tags: ['apm', 'log', 'error', 'culprit'],
};

/**
 * An OpenTelemetry exception event, without any processing
 */
export const OtelUnprocessedException: Story = {
  name: 'OpenTelemetry uprocessed exception',
  args: {
    hit: exceptionUprocessedOtel,
  },
  tags: ['exception', 'otel', 'unprocessed'],
};
/**
 * Kubernetes container log captured by Filebeat.
 */
export const K8sContainerLog: Story = {
  name: 'Filebeat Kubernetes container log',
  args: {
    hit: k8sContainerLogFixture,
  },
  tags: ['k8s', 'log', 'filebeat'],
};
