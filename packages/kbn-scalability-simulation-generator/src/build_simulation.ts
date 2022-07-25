/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stage } from './types/journey';
import { Header, Request, Simulation } from './types/simulation';

const AUTH_PATH = '/internal/security/login';
const B_SEARCH_PATH = '/internal/bsearch';

const getHeaders = (headers: readonly Header[]) =>
  headers
    .map(
      (header) =>
        `"${header.name}" -> ${JSON.stringify(
          header.name !== 'Cookie' ? header.value : '${Cookie}'
        )}`
    )
    .join(',')
    .replace(/^/, 'Map(') + ')';

const getPayload = (body: string) => JSON.stringify(body).replace(/"/g, '\\"');

const getDuration = (duration: string) => {
  const value = duration.replace(/\D+/, '');
  return duration.endsWith('m') ? `${value} * 60` : value;
};

/**
 * Builds Gatling simulation content from common template
 * @param packageName scala package name, where simulation file will be placed
 * @param simulationName scala class name
 * @param protocol Gatling protocol string
 * @param scenario Gatling scenario string
 * @param setup Gatling simulation injection setup string
 * @returns Gatling simulation content as string
 */
const buildSimulation = (
  packageName: string,
  simulationName: string,
  protocol: string,
  scenario: string,
  setup: string
) =>
  `package ${packageName}

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._

class ${simulationName} extends Simulation {
${protocol}

${scenario}

${setup}
}`;

const buildAuthenticationExec = (path: string, headers: string, payload: string) =>
  `   .exec(
      http("${path}")
        .post("${path}")
        .body(StringBody("${payload}"))
        .asJson
        .headers(${headers})
        .check(headerRegex("set-cookie", ".+?(?=;)").saveAs("Cookie"))
      )`;

const buildBSearchExec = (path: string, headers: string, payload: string) =>
  `    .exec(
      http("${path}")
        .post("${path}")
        .headers(${headers})
        .body(StringBody(${payload}))
        .asJson
        .check(status.is(200).saveAs("status"))
        .check(jsonPath("$.result.id").find.saveAs("requestId"))
        .check(jsonPath("$.result.isPartial").find.saveAs("isPartial"))
      )
      .exitHereIfFailed
      // First response might be “partial”. Then we continue to fetch for the results
      // using the request id returned from the first response
      .asLongAs(session =>
        session("status").as[Int] == 200
          && session("isPartial").as[Boolean]
      ) {
        exec(
          http("${path}")
            .post("${path}")
            .headers(${headers})
            .body(StringBody(${payload}))
            .asJson
            .check(status.is(200).saveAs("status"))
            .check(jsonPath("$.result.isPartial").saveAs("isPartial"))
        )
        .exitHereIfFailed
        .pause(1)
      }`;

const buildCommonHttpExec = (path: string, method: string, headers: string) =>
  `    .exec(
      http("${path}")
        .${method}("${path}")
        .headers(${headers})
    )`;

const buildCommonHttpBodyExec = (path: string, method: string, headers: string, payload: string) =>
  `    .exec(
      http("${path}")
        .${method}("${path}")
        .body(StringBody("${payload}"))
        .asJson
        .headers(${headers})
    )`;

const addPause = (delay: number) => `    .pause(${delay}.milliseconds)`;

const buildProtocol = (baseUrl: string) =>
  `  val httpProtocol = http
    .baseUrl("${baseUrl}")
    .inferHtmlResources()
    .acceptHeader("*/*")
    .acceptEncodingHeader("gzip, deflate")
    .acceptLanguageHeader("en-US,en;q=0.9,ru;q=0.8,de;q=0.7")
    .userAgentHeader("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.83 Safari/537.36")`;

const buildScenarioDefinition = (phase: string, scenarioName: string) =>
  `  val ${phase} = scenario("${scenarioName} ${phase}")
      .exec(steps)`;

/**
 * Builds Gatling simulation setUp section, that defines injection for warmup and test scenarios
 * @param warmupStages
 * @param testStages
 * @param maxDuration
 * @returns Gatling simulation setUp as a string
 */
const buildSetup = (warmupStages: string, testStages: string, maxDuration: string) =>
  `  setUp(
    warmup
      .inject(${warmupStages})
      .protocols(httpProtocol)
      .andThen(
        test
          .inject(${testStages})
          .protocols(httpProtocol)
      )
    ).maxDuration(${maxDuration})`;

const buildExecStep = (request: Request) => {
  const headers = getHeaders(request.headers);
  const method = request.method.toLowerCase();
  if (!request.body) {
    return buildCommonHttpExec(request.path, method, headers);
  } else if (request.path.includes(AUTH_PATH)) {
    return buildAuthenticationExec(request.path, headers, getPayload(request.body));
  } else if (request.path.includes(B_SEARCH_PATH)) {
    return buildBSearchExec(request.path, headers, getPayload(request.body));
  } else {
    return buildCommonHttpBodyExec(request.path, method, headers, getPayload(request.body));
  }
};

/**
 * Builds Gatling scenario body
 * @param scenarioName scenario name
 * @param requests Kibana API requests
 * @returns Gatling scenario as a string
 */
const buildScenario = (scenarioName: string, requests: readonly Request[]): string => {
  const warmupScn = buildScenarioDefinition('warmup', scenarioName);
  const testScn = buildScenarioDefinition('test', scenarioName);
  // convert requests into array of Gatling exec http calls
  const execs = requests.map((request, index, reqArray) => {
    // construct Gatling exec http calls
    const exec = buildExecStep(request);
    // add delay between requests
    if (index < reqArray.length - 1) {
      const delay = reqArray[index + 1].timestamp - request.timestamp;
      if (delay > 0) {
        return exec + '\n' + addPause(delay);
      }
    }
    return exec;
  });
  const steps = execs.join('\n');
  const finalSteps = steps.slice(0, steps.indexOf('.')) + steps.slice(steps.indexOf('.') + 1);

  return '  val steps =\n' + finalSteps + '\n\n' + warmupScn + '\n' + testScn + '\n';
};

/**
 * Builds injection setup for scenario
 * @param stages Array of actions to be executed with users count and duration
 * @returns scenario injection as a string
 */
const buildBenchmarkingModel = (stages: readonly Stage[]) => {
  return stages
    .map((stage) => {
      return stage.action === 'constantConcurrentUsers'
        ? `${stage.action}(${stage.maxUsersCount}) during (${getDuration(stage.duration)})`
        : `${stage.action}(${stage.minUsersCount}) to ${stage.maxUsersCount} during (${getDuration(
            stage.duration
          )})`;
    })
    .join(', ');
};

/**
 * Generates Gatling-compatible simulation content
 * @param params Simulation parameters
 * @returns Gatling simulation content as string
 */
export const generateSimulationContent = (params: Simulation) => {
  const { simulationName, packageName, scenarioName, baseUrl, requests, scalabilitySetup } = params;
  const protocol = buildProtocol(baseUrl);
  const scenario = buildScenario(scenarioName, requests);
  const setup = buildSetup(
    buildBenchmarkingModel(scalabilitySetup.warmup.stages),
    buildBenchmarkingModel(scalabilitySetup.test.stages),
    getDuration(scalabilitySetup.maxDuration)
  );

  return buildSimulation(packageName, simulationName, protocol, scenario, setup);
};
