/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient, Logger } from 'src/core/server';
import { either } from 'fp-ts/lib/Either';
import fetch from 'node-fetch';
import type { Type } from 'io-ts';
import type { Subscription } from 'rxjs';
import { Subject, ReplaySubject, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import type { estypes } from '@elastic/elasticsearch';
import type {
  EventChannelOptions,
  EventBasedTelemetryServiceConfig,
  EventEnvelope,
  EventWithTimestamp,
} from './types';
import { convertSchemaToIoTs } from '../../common/schema/schema_to_io_ts';
import { ByteSizedQueue } from './byte_sized_queue';
import { LeakyBucket } from './leaky_bucket';

export interface ChannelQueueDefinition {
  queue?: ByteSizedQueue<EventWithTimestamp>;
  validator: Type<{ [key: string]: unknown }>;
  quotaPercentage?: EventChannelOptions['quotaPercentage'];
}

export type PluginName = string;
export type ChannelName = string;

export type PluginMap = Map<ChannelName, ChannelQueueDefinition>;

export class EventBasedTelemetryService {
  private readonly queues = new Map<PluginName, PluginMap>();
  private readonly leakyBucket: LeakyBucket;
  private readonly eventsEnqueued$ = new Subject<number>();
  private started = false;
  private clusterInfo$ = new ReplaySubject<estypes.RootNodeInfoResponse>(1);
  private licenseId?: string;
  private isOptedIn?: boolean;
  private timer?: Subscription;

  constructor(
    private readonly logger: Logger,
    private readonly config: EventBasedTelemetryServiceConfig
  ) {
    this.leakyBucket = new LeakyBucket(
      this.logger.get('leaky-bucket'),
      config.leaky_bucket,
      () => this.readNextGenerator(),
      this.eventsEnqueued$
    );
  }

  public registerChannel(pluginName: string, channelOptions: EventChannelOptions) {
    if (this.started) {
      throw new Error(`Channels can only be registered during the setup lifecycle step.`);
    }
    const { name: channelName, schema, quotaPercentage } = channelOptions;
    this.logger.debug(`Registering channel "${channelName}" from plugin "${pluginName}"`);

    if (!this.queues.get(pluginName)) {
      this.queues.set(pluginName, new Map());
    }

    this.queues.get(pluginName)?.set(channelName, {
      validator: convertSchemaToIoTs(schema),
      quotaPercentage,
    });
  }

  public sendToChannel(pluginName: string, channelName: string, events: unknown[]): boolean {
    // No need to enqueue anything if it's opted-opt
    if (this.isOptedIn === false) {
      this.logger
        .get(pluginName, channelName)
        .info(`Not enqueueing any event because the cluster is opted-out.`);
      return false;
    }

    const channel = this.queues.get(pluginName)?.get(channelName);

    if (channel) {
      const { queue, validator } = channel;
      // If the queue does not exist yet, there's no need to use all the additional CPU cycles
      if (queue) {
        // Using validator.is because it's much faster and we don't care about the validation errors in production
        const validEvents = events.filter((event) => validator.is(event));

        if (this.config.isDev && validEvents.length < events.length) {
          // If we are running in developer mode, log the validation errors
          this.validateLogErrors(pluginName, channelName, channel, events);
        }

        if (validEvents.length > 0) {
          const timestamp = new Date().toISOString();
          validEvents.forEach((event) => {
            const envelope: EventWithTimestamp = { timestamp, [channelName]: event };
            this.logger
              .get(pluginName, channelName)
              .info(`Enqueued event ${JSON.stringify(event)}`);
            queue.push(envelope);
          });

          this.eventsEnqueued$.next(validEvents.length);

          return true;
        }
      }
    }
    return false;
  }

  public start(esClient: ElasticsearchClient) {
    this.started = true;
    this.assignQuotas();
    this.leakyBucket.start((events) => this.sendHttpRequest(events));
    this.timer = timer(0, this.config.refresh_cluster_ids_interval.asMilliseconds()).subscribe(() =>
      this.cacheCommonValues(esClient)
    );
  }

  public stop() {
    this.leakyBucket.stop();
    this.timer?.unsubscribe();
    this.eventsEnqueued$.complete();
    this.clusterInfo$.complete();
  }

  private async sendHttpRequest(events: string[]) {
    if (events.length === 0) {
      return;
    }

    const { cluster_uuid: clusterUuid, version } = await this.clusterInfo$
      .pipe(first())
      .toPromise();

    const url = this.buildUrl('kibana-events');
    this.logger.debug(`Sending ${events.length} events to ${url}`);

    const response = await fetch(url, {
      method: 'post',
      body: `${events.join('\n')}\n`,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'X-Elastic-Stack-Version': version.number,
        'X-Elastic-Cluster-ID': clusterUuid,
        ...(this.licenseId && { 'X-Elastic-License-ID': this.licenseId }),
      },
    });

    this.logger.debug(`HTTP response: ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`Failed to send telemetry: ${await response.text()}`);
    }
  }

  private buildUrl(channelName: string) {
    const url = new URL(this.config.telemetryUrl.toString());
    if (!url.hostname.includes('staging')) {
      url.pathname = `/v3/send/${channelName}`;
    } else {
      // TODO: Remove when Infra is done with their proxy config
      url.pathname = `/v3-dev/send/${channelName}`;
    }
    return url.toString();
  }

  /**
   * Cache common cluster-level data to avoid hitting the same endpoints too often.
   * @param esClient {@link ElasticsearchClient}
   * @private
   */
  private async cacheCommonValues(esClient: ElasticsearchClient) {
    // Update the clusterInfo
    const { body: clusterInfo } = await esClient.info();
    this.clusterInfo$.next(clusterInfo);

    // Update the licenseId
    await this.fetchLicense(esClient);

    // Update opted-in status
    // TODO: we might prefer an observable here to avoid the polling delay
    this.isOptedIn = await this.config.getIsOptedIn();
  }

  /**
   * Update this.licenseId with the cluster's license.uuid
   * @param esClient
   * @private
   */
  private async fetchLicense(esClient: ElasticsearchClient) {
    try {
      const {
        body: { license },
      } = await esClient.license.get({ filter_path: ['license.uid'] });
      this.licenseId = license.uid;
    } catch (err) {
      this.logger.debug(`Failed to retrieve the license`, err);
    }
  }

  /**
   * Assigns the {@link ByteSizedQueue}s to all channels, bearing in mind quotaPercentage preferences
   * and evenly splitting the rest.
   * @private
   */
  private assignQuotas() {
    const pluginSizeQuotaInBytes = this.config.plugin_size_quota_in_bytes.getValueInBytes();
    this.queues.forEach((pluginQueues, pluginName) => {
      let remainingQuota = pluginSizeQuotaInBytes;
      const allChannels = [...pluginQueues.entries()];

      const channelsWithFixedQuotas = allChannels.filter(
        ([, { quotaPercentage }]) => typeof quotaPercentage === 'number'
      );
      const channelsWithNoQuotas = allChannels.filter(
        ([, { quotaPercentage }]) => typeof quotaPercentage === 'undefined'
      );

      // Assign queues to all the channels that have a fixed quota first
      channelsWithFixedQuotas.forEach(([channelName, options]) => {
        const queueMaxByteSize = Math.max(
          1, // At least 1 byte
          Math.trunc(options.quotaPercentage! * pluginSizeQuotaInBytes)
        );
        options.queue = new ByteSizedQueue(
          this.logger.get(pluginName, channelName),
          queueMaxByteSize
        );
        remainingQuota -= queueMaxByteSize;
      });

      // We should be able to assign at least 1 byte to the remaining queues.
      // Note: This check is still valid if all channels have explicit quotas but they add up more than 100% because
      //       the remaining quota will be negative and 0 > Negative number
      if (channelsWithNoQuotas.length > remainingQuota) {
        throw new Error(
          `The plugin "${pluginName}" is over-assigning memory to its Event-telemetry channels.`
        );
      }

      const evenQuota = Math.max(1, Math.trunc(remainingQuota / channelsWithNoQuotas.length));
      channelsWithNoQuotas.forEach(([channelName, options]) => {
        options.queue = new ByteSizedQueue(this.logger.get(pluginName, channelName), evenQuota);
      });
    });
  }

  /**
   * It round-robins through all plugins and their channels, yielding one entry of the queue at a time.
   *
   * @remark
   * To equally prioritize all the plugin's events, we need a process to loop
   * through one plugin + channel at a time in a similar fashion to:
   * 1. Plugin A - Channel A.1
   * 2. Plugin B - Channel B.1
   * 3. Plugin C - Channel C.1
   * 4. Plugin A - Channel A.2
   * ...
   * @private
   */
  private async *readNextGenerator(): AsyncGenerator<EventEnvelope> {
    const plugins = [...this.queues.entries()];

    // We have at least one plugin
    if (plugins.length > 0) {
      // Wait until we figure out the clusterUuid
      const {
        cluster_uuid: clusterUuid,
        cluster_name: clusterName,
        version,
      } = await this.clusterInfo$.pipe(first()).toPromise();

      let somethingRead = false;
      const lastChannelIndexRead = new Map<PluginName, number>();
      do {
        let pluginIndex = -1;
        somethingRead = false;
        while (++pluginIndex < plugins.length) {
          const [pluginName, pluginQueues] = plugins[pluginIndex];
          const channels = [...pluginQueues.entries()];
          const { index, event } = this.getNextEventFromTheNextAvailableChannel(
            channels,
            lastChannelIndexRead.get(pluginName)
          );
          lastChannelIndexRead.set(pluginName, index);
          const [channelName] = channels[index];
          if (event) {
            somethingRead = true;
            yield {
              cluster_uuid: clusterUuid,
              cluster_name: clusterName,
              version: version.number,
              licenseId: this.licenseId,
              plugin_name: pluginName,
              channel_name: channelName,
              ...event,
            };
          }
        }
      } while (somethingRead);
    }
  }

  /**
   * Try to read the next available event from the channels.
   * Even if it has to loop over. This is to ensure an equal split per plugin
   * @param channels
   * @param fromIndex
   * @private
   */
  private getNextEventFromTheNextAvailableChannel(
    channels: Array<[string, ChannelQueueDefinition]>,
    fromIndex: number = 0
  ): {
    index: number;
    event?: EventWithTimestamp;
  } {
    let index = fromIndex;
    do {
      index = (index + 1) % channels.length;
      const [, channelDetails] = channels[index];
      const event = channelDetails.queue?.read();
      if (event) {
        return { index, event };
      }
    } while (index !== fromIndex);
    return { index };
  }

  /**
   * Log.errors all the validation failure details.
   * @remark It should be used in development only because telemetry failures should not bother production users.
   * @param pluginName
   * @param channelName
   * @param validator
   * @param events
   * @private
   */
  private validateLogErrors(
    pluginName: string,
    channelName: string,
    { validator }: ChannelQueueDefinition,
    events: unknown[]
  ) {
    events.forEach((event) => {
      const result = validator.decode(event);
      either.mapLeft(result, (errors) => {
        this.logger
          .get(pluginName, channelName)
          .error(`Failed to validate some events: ${JSON.stringify(errors, null, 2)}`);
      });
    });
  }
}
