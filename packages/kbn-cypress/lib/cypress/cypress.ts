/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import _ from 'lodash';
import * as fs from 'fs';
// import globby from 'globby';
// import pMap from 'p-map';
import getPort from 'get-port';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import cypress from 'cypress';
import Debug from 'debug';
import deepMerge from 'deepmerge';
import {
  EsVersion,
  FunctionalTestRunner,
  readConfigFile,
  runElasticsearch,
  runKibanaServer,
} from '@kbn/test';
import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import * as parser from '@babel/parser';
import type {
  ExpressionStatement,
  Identifier,
  ObjectExpression,
  ObjectProperty,
} from '@babel/types';

import pRetry from 'p-retry';
// import { getLocalhostRealIp } from '../endpoint/common/localhost_services';
import { getCypressRunAPIParams } from '../config';
import { CurrentsRunParameters, CypressResult, ValidatedCurrentsParameters } from '../../types';

const debug = Debug('currents:cypress');
interface RunCypressSpecFile {
  spec: string;
}

export function runBareCypress(params: CurrentsRunParameters = {}) {
  // revert currents params to cypress params
  // exclude record mode params
  const p = {
    ...params,
    ciBuildId: undefined,
    tag: undefined,
    parallel: undefined,
    record: false,
    group: undefined,
    spec: _.flatten(params.spec).join(','),
  };
  debug('Running bare Cypress with params %o', p);
  return cypress.run(p);
}

/**
 * Run Cypress tests, we need to pass down the stripped options as if we've received them from the CLI
 */
export async function runSpecFile(
  { spec }: RunCypressSpecFile,
  cypressRunOptions: ValidatedCurrentsParameters
) {
  const runAPIOptions = getCypressRunAPIParams(cypressRunOptions);

  const options = {
    ...runAPIOptions,
    headed: true,
    headless: false,
    browser: 'chrome',

    config: {
      ...runAPIOptions.config,
      trashAssetsBeforeRuns: false,
    },
    env: {
      ...runAPIOptions.env,
      currents_ws: true,
    },
    spec,
  };
  debug('running cypress with options %o', options);
  const result = await cypress.run(options);

  debug('cypress run result %o', result);
  return result;
}

export const parseTestFileConfig = (
  filePath: string
): Record<string, string | number | Record<string, string | number>> | undefined => {
  const testFile = fs.readFileSync(filePath, { encoding: 'utf8' });

  const ast = parser.parse(testFile, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  const expressionStatement = _.find(ast.program.body, ['type', 'ExpressionStatement']) as
    | ExpressionStatement
    | undefined;

  const callExpression = expressionStatement?.expression;
  // @ts-expect-error
  if (expressionStatement?.expression?.arguments?.length === 3) {
    // @ts-expect-error
    const callExpressionArguments = _.find(callExpression?.arguments, [
      'type',
      'ObjectExpression',
    ]) as ObjectExpression | undefined;

    const callExpressionProperties = _.find(callExpressionArguments?.properties, [
      'key.name',
      'env',
    ]) as ObjectProperty[] | undefined;
    // @ts-expect-error
    const ftrConfig = _.find(callExpressionProperties?.value?.properties, [
      'key.name',
      'ftrConfig',
    ]);

    if (!ftrConfig) {
      return {};
    }

    return _.reduce(
      ftrConfig.value.properties,
      (acc: Record<string, string | number | Record<string, string>>, property) => {
        const key = (property.key as Identifier).name;
        let value;
        if (property.value.type === 'ArrayExpression') {
          value = _.map(property.value.elements, (element) => {
            if (element.type === 'StringLiteral') {
              return element.value as string;
            }
            return element.value as string;
          });
        }
        if (key && value) {
          // @ts-expect-error
          acc[key] = value;
        }
        return acc;
      },
      {}
    );
  }
  return undefined;
};

export const runSpecFileSafe = async (
  { spec }: RunCypressSpecFile,
  cypressRunOptions: ValidatedCurrentsParameters
): Promise<CypressResult> => {
  try {
    console.error('runSpecFileSafe', spec);
    const { argv } = yargs(process.argv.slice(2));

    const log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    let result;

    const tst = await withProcRunner(log, async (procs) => {
      const abortCtrl = new AbortController();

      const onEarlyExit = (msg: string) => {
        log.error(msg);
        abortCtrl.abort();
      };

      const esPort: number = await getPort();
      const kibanaPort: number = await getPort();
      const fleetServerPort: number = await getPort();

      // const esPort: number = getEsPort();
      // const kibanaPort: number = getKibanaPort();
      // const fleetServerPort: number = getFleetServerPort();
      const configFromTestFile = parseTestFileConfig(spec);

      const config = await readConfigFile(
        log,
        EsVersion.getDefault(),
        _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile,
        {
          servers: {
            elasticsearch: {
              port: esPort,
            },
            kibana: {
              port: kibanaPort,
            },
            // fleetserver: {
            //   port: fleetServerPort,
            // },
          },
          kbnTestServer: {
            serverArgs: [
              `--server.port=${kibanaPort}`,
              `--elasticsearch.hosts=http://localhost:${esPort}`,
            ],
          },
        },
        (vars) => {
          const hasFleetServerArgs = _.some(
            vars.kbnTestServer.serverArgs,
            (value) =>
              value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
              value.includes('--xpack.fleet.agents.elasticsearch.host')
          );

          vars.kbnTestServer.serverArgs = _.filter(
            vars.kbnTestServer.serverArgs,
            (value) =>
              !(
                value.includes('--elasticsearch.hosts=http://localhost:9220') ||
                value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
                value.includes('--xpack.fleet.agents.elasticsearch.host')
              )
          );

          if (
            // @ts-expect-error
            configFromTestFile?.enableExperimental?.length &&
            _.some(vars.kbnTestServer.serverArgs, (value) =>
              value.includes('--xpack.securitySolution.enableExperimental')
            )
          ) {
            vars.kbnTestServer.serverArgs = _.filter(
              vars.kbnTestServer.serverArgs,
              (value) => !value.includes('--xpack.securitySolution.enableExperimental')
            );
            vars.kbnTestServer.serverArgs.push(
              `--xpack.securitySolution.enableExperimental=${JSON.stringify(
                configFromTestFile?.enableExperimental
              )}`
            );
          }

          // if (hasFleetServerArgs) {
          //   const hostRealIp = getLocalhostRealIp();

          //   vars.kbnTestServer.serverArgs.push(
          //     `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`,
          //     `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
          //   );
          // }

          return vars;
        }
      );

      const lifecycle = new Lifecycle(log);

      const providers = new ProviderCollection(log, [
        ...readProviderSpec('Service', {
          lifecycle: () => lifecycle,
          log: () => log,
          config: () => config,
        }),
        ...readProviderSpec('Service', config.get('services')),
      ]);

      const options = {
        installDir: process.env.KIBANA_INSTALL_DIR,
      };

      const shutdownEs = await pRetry(
        async () =>
          runElasticsearch({
            config,
            log,
            name: `ftr-${esPort}`,
            esFrom: 'snapshot',
            onEarlyExit,
          }),
        { retries: 3, forever: false }
      );

      await runKibanaServer({
        procs,
        config,
        installDir: options?.installDir,
        extraKbnOpts: options?.installDir
          ? []
          : ['--dev', '--no-dev-config', '--no-dev-credentials'],
        onEarlyExit,
      });

      await providers.loadAll();

      const functionalTestRunner = new FunctionalTestRunner(log, config, EsVersion.getDefault());

      const customEnv = await functionalTestRunner.run(abortCtrl.signal);

      console.error('customEnv', customEnv);
      console.error('cypressRunOptions', cypressRunOptions);
      cypressRunOptions.env = deepMerge(cypressRunOptions.env, customEnv);
      cypressRunOptions.config = deepMerge(cypressRunOptions.config || {}, {
        baseUrl: customEnv.BASE_URL,
      });
      result = await runSpecFile({ spec }, cypressRunOptions);
      // if (isOpen) {
      //   await cypress.open({
      //     configFile: require.resolve(`../../${argv.configFile}`),
      //     config: {
      //       e2e: {
      //         baseUrl: `http://localhost:${kibanaPort}`,
      //       },
      //       env: customEnv,
      //     },
      //   });
      // } else {
      //   try {
      //     result = await cypress.run({
      //       browser: 'chrome',
      //       spec: filePath,
      //       configFile: argv.configFile as string,
      //       reporter: argv.reporter as string,
      //       reporterOptions: argv.reporterOptions,
      //       config: {
      //         e2e: {
      //           baseUrl: `http://localhost:${kibanaPort}`,
      //         },
      //         numTestsKeptInMemory: 0,
      //         env: customEnv,
      //       },
      //     });
      //   } catch (error) {
      //     result = error;
      //   }
      // }

      await procs.stop('kibana');
      shutdownEs();
      // cleanupServerPorts({ esPort, kibanaPort, fleetServerPort });

      return result;
    });

    console.error('tsts', tst);
    console.error('result', result);

    return result;
  } catch (error) {
    debug('cypress run exception %o', error);
    return {
      status: 'failed',
      failures: 1,
      message: `Cypress process crashed with an error:\n${(error as Error).message}\n${
        (error as Error).stack
      }}`,
    };
  }
};
