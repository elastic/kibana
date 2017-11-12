import { Observable } from '@elastic/kbn-observable';
import { Router } from '../server/http';
import { LoggerFactory } from '../logging';

import { TestConfig } from './TestConfig';
import { registerTestRoutes } from './routes';

export class TestPlugin {
  constructor(
    readonly config$: Observable<TestConfig>,
    private readonly logger: LoggerFactory,
  ) {}

  createRoutes() {
    const router = new Router('/test');

    return registerTestRoutes(router, this.logger);
  }
}
