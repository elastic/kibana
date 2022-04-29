/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { firstValueFrom, Subject } from 'rxjs';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import {
  UserContentPluginSetup,
  UserContentPluginStart,
  UserContentStartDependencies,
  UserContentEventsStream,
} from './types';
import { registerRoutes } from './routes';
import { MetadataEventsService } from './services';

export class UserContentPlugin
  implements
    Plugin<UserContentPluginSetup, UserContentPluginStart, {}, UserContentStartDependencies>
{
  private readonly logger: Logger;
  private userContentEventStream$ = new Subject<UserContentEventsStream>();
  private metadataEventsService: MetadataEventsService;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.metadataEventsService = new MetadataEventsService({ logger: this.logger });
  }

  public setup({ http }: CoreSetup) {
    this.logger.debug('Setting up UserContent plugin');

    const userContentEventStreamPromise = firstValueFrom(this.userContentEventStream$);

    registerRoutes({
      http,
      userContentEventStreamPromise,
      metadataEventsService: this.metadataEventsService,
    });

    this.metadataEventsService.init({
      userContentEventStreamPromise,
    });

    return {};
  }

  public start(core: CoreStart, { metadataEventsStreams }: UserContentStartDependencies) {
    this.logger.debug('Starting up UserContent plugin');

    const userContentEventStream = metadataEventsStreams.registerEventStream('userContent');
    this.userContentEventStream$.next(userContentEventStream);

    return {};
  }
}
