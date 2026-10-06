/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DisposableAppender, LogRecord } from '@kbn/logging';
import type { OtelAppenderPluginConfig } from '@kbn/core-logging-server';
/**
 * A Kibana log appender that ships log records to an OTLP-compatible endpoint
 * using the OpenTelemetry Logs SDK.  Records are buffered by the SDK's
 * {@link BatchLogRecordProcessor} and flushed periodically or on shutdown.
 * @internal
 */
export declare class OtelAppender implements DisposableAppender {
  static configSchema: import('@kbn/config-schema').ObjectType<{
    type: import('@kbn/config-schema').Type<'otel'>;
    protocol: import('@kbn/config-schema').Type<'grpc' | 'http' | 'proto'>;
    url: import('@kbn/config-schema').Type<string>;
    headers: import('@kbn/config-schema').Type<Record<string, string>>;
    /**
     * Serverless / internal only. Max log records buffered by the batch processor; once full,
     * new records are dropped. Floored at 512, the SDK's default export batch size.
     */
    maxQueueSize: import('@kbn/config-schema').ConditionalType<true, number, number>;
    /**
     * Serverless / internal only. How long transient export failures are retried before the
     * batch is dropped; enables {@link RetryingLogRecordExporter}.
     */
    maxElapsedTime: import('@kbn/config-schema').ConditionalType<
      true,
      import('moment').Duration,
      import('moment').Duration
    >;
    /**
     * Optional layout config. Defaults to pattern layout (body.text, aliased to `message`).
     * Use `{ type: 'json' }` for a structured body (body.structured); note that the ECS
     * `message` field will be empty in that case because it aliases body.text.
     */
    layout: import('@kbn/config-schema').Type<
      | Readonly<
          {} & {
            type: 'json';
          }
        >
      | Readonly<
          {
            highlight?: boolean | undefined;
            pattern?: string | undefined;
          } & {
            type: 'pattern';
          }
        >
      | undefined
    >;
    attributes: import('@kbn/config-schema').Type<Record<string, string> | undefined>;
    includeResources: import('@kbn/config-schema').Type<string[] | undefined>;
    promoteResourceAttributes: import('@kbn/config-schema').Type<string[] | undefined>;
    ssl: import('@kbn/config-schema').Type<
      | Readonly<
          {
            certificateAuthorities?: string | string[] | undefined;
            certificate?: string | undefined;
            key?: string | undefined;
            keyPassphrase?: string | undefined;
          } & {
            verificationMode: 'certificate' | 'full' | 'none';
            allowPartialTrustChain: boolean;
          }
        >
      | undefined
    >;
  }>;
  /**
   * {@link OtelAppender.configSchema} plus the plugin-only options of
   * {@link OtelAppenderPluginConfig}; used only by the {@link LoggingServiceSetup.configure}
   * validation path, never wired into YAML config validation.
   */
  static runtimeConfigSchema: import('@kbn/config-schema').ObjectType<
    Omit<
      {
        type: import('@kbn/config-schema').Type<'otel'>;
        protocol: import('@kbn/config-schema').Type<'grpc' | 'http' | 'proto'>;
        url: import('@kbn/config-schema').Type<string>;
        headers: import('@kbn/config-schema').Type<Record<string, string>>;
        /**
         * Serverless / internal only. Max log records buffered by the batch processor; once full,
         * new records are dropped. Floored at 512, the SDK's default export batch size.
         */
        maxQueueSize: import('@kbn/config-schema').ConditionalType<true, number, number>;
        /**
         * Serverless / internal only. How long transient export failures are retried before the
         * batch is dropped; enables {@link RetryingLogRecordExporter}.
         */
        maxElapsedTime: import('@kbn/config-schema').ConditionalType<
          true,
          import('moment').Duration,
          import('moment').Duration
        >;
        /**
         * Optional layout config. Defaults to pattern layout (body.text, aliased to `message`).
         * Use `{ type: 'json' }` for a structured body (body.structured); note that the ECS
         * `message` field will be empty in that case because it aliases body.text.
         */
        layout: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                type: 'json';
              }
            >
          | Readonly<
              {
                highlight?: boolean | undefined;
                pattern?: string | undefined;
              } & {
                type: 'pattern';
              }
            >
          | undefined
        >;
        attributes: import('@kbn/config-schema').Type<Record<string, string> | undefined>;
        includeResources: import('@kbn/config-schema').Type<string[] | undefined>;
        promoteResourceAttributes: import('@kbn/config-schema').Type<string[] | undefined>;
        ssl: import('@kbn/config-schema').Type<
          | Readonly<
              {
                certificateAuthorities?: string | string[] | undefined;
                certificate?: string | undefined;
                key?: string | undefined;
                keyPassphrase?: string | undefined;
              } & {
                verificationMode: 'certificate' | 'full' | 'none';
                allowPartialTrustChain: boolean;
              }
            >
          | undefined
        >;
      },
      'dropResourceAttributes' | 'maxElapsedTime' | 'maxQueueSize' | 'transformAttributes'
    > & {
      transformAttributes: import('@kbn/config-schema').Type<any>;
      dropResourceAttributes: import('@kbn/config-schema').Type<string[] | undefined>;
      maxQueueSize: import('@kbn/config-schema').Type<number | undefined>;
      maxElapsedTime: import('@kbn/config-schema').Type<import('moment').Duration | undefined>;
    }
  >;
  private readonly loggerProvider;
  private readonly logger;
  private readonly layout;
  /** True when using JSON layout: the full LogRecord is sent as `body.structured`. */
  private readonly useStructuredBody;
  private readonly transformAttributes?;
  private readonly promotedAttributes;
  private disposed;
  constructor(config: OtelAppenderPluginConfig);
  append(record: LogRecord): void;
  dispose(): Promise<void>;
}
