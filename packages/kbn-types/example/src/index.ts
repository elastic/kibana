import { KibanaFunctionalPlugin, Logger } from '@elastic/kbn-types';

const plugin: KibanaFunctionalPlugin<{}> = core => {
  const { elasticsearch, http, logger } = core;

  foo(logger.get());

  elasticsearch.config$.subscribe(config => {
    console.log(config);
  });

  const router = http.createAndRegisterRouter('/api/foo', {});
};

function foo(log: Logger) {
  log.info('test');
}
