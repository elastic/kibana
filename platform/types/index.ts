import { ConfigService } from '../config';
import { HttpModule } from '../server/http';
import { KibanaModule } from '../server/kibana';
import { ElasticsearchModule } from '../server/elasticsearch';
import { LoggerFactory } from '../logging';

export interface KibanaCoreModules {
  elasticsearch: ElasticsearchModule;
  kibana: KibanaModule;
  http: HttpModule;
  configService: ConfigService;
  logger: LoggerFactory;
}

export interface CoreService {
  start(): Promise<void>;
  stop(): Promise<void>;
}
