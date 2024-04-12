/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

import globby from 'globby';
import yaml from 'js-yaml';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import {
  BuildkitePipelineConfig,
  BuildkiteScheduleConfig,
  Hcl2JsonModelForKibanaBuildkite,
  TypeWithExtraFields,
} from './types';
import { BuildkitePipelineManifest } from './pipelineBackstageDefinitions';

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_OUTPUT_PATH = path.resolve(REPO_ROOT, '.buildkite', 'pipeline-resource-definitions');
const DEFAULT_LOCATION_FILE_NAME = 'locations.yml';
const REPO_FILES_PREFIX = 'https://github.com/elastic/kibana/blob/main';
const TMP_DIR = fs.mkdtempSync(path.resolve(os.tmpdir(), 'buildkite-migration'));

const SCHEMA_DEF = `# yaml-language-server: $schema=https://gist.githubusercontent.com/elasticmachine/988b80dae436cafea07d9a4a460a011d/raw/rre.schema.json\n`;

const DUMP_OPTIONS = { skipInvalid: true, lineWidth: 200 };

export const runMigration = () =>
  run(
    async ({ log, flagsReader }) => {
      const warnings: string[] = [];
      log.setWriters(
        log.getWriters().concat({
          write(msg: any) {
            if (msg.type === 'warning') {
              warnings.push(msg.args.join(' '));
              return true;
            } else {
              return false;
            }
          },
        })
      );

      assertHclToJsonIsInstalled();

      if (DRY_RUN) {
        log.info('Running in dry-run mode, files will be written to: ' + TMP_DIR);
      }

      // Read runtime flags
      const pathToPipelines = flagsReader.requiredString('input-folder');
      const outputFolder = flagsReader.string('output-folder') || DEFAULT_OUTPUT_PATH;
      const locationFilePath =
        flagsReader.string('outputLocationFile') ||
        path.resolve(outputFolder, DEFAULT_LOCATION_FILE_NAME);
      const filterExpression = flagsReader.string('filter') || '';

      // Ensure output folder exists
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      // Collect .tf files
      const paths = (
        await globby('*.tf', {
          cwd: pathToPipelines,
          onlyFiles: true,
          gitignore: true,
        })
      ).filter((p) => !filterExpression || p.match(filterExpression));

      // Generate YAML files for each pipeline definition
      const unprocessedFiles: string[] = [];
      await Promise.all(
        paths.map(async (tfFilePath) => {
          const fullTfFilePath = path.resolve(pathToPipelines, tfFilePath);
          const catalogFilePath = generateCatalogFile({
            tfFilePath: fullTfFilePath,
            outputFolder,
            log,
          });
          if (catalogFilePath) {
            return [path.relative(REPO_ROOT, catalogFilePath)];
          } else {
            unprocessedFiles.push(tfFilePath);
            return [];
          }
        })
      ).then((arr) => arr.flat());

      // Generate a location file that points to all generated YAML files
      const catalogLocationFilePath = compileLocationFile({
        locationFilePath,
        log,
      });

      // Update the catalog-info.yml file to point to the location file
      updateCatalogLocationInCatalogInfo({ catalogLocationFilePath, log });

      log.success('Done!');
      if (unprocessedFiles.length > 0) {
        log.warning(`The following files were not processed due to various errors:`);
        log.warning(unprocessedFiles.join('\n'));
        if (!DRY_RUN) {
          const warningLogFilePath = path.resolve(REPO_ROOT, 'conversion_warnings.log');
          log.warning(`All warnings were written to ${warningLogFilePath}`);
          fs.writeFileSync(warningLogFilePath, warnings.join('\n') + '\n');
        } else {
          const warningLogFilePath = path.resolve(TMP_DIR, 'conversion_warnings.log');
          log.warning(`All warnings were written to ${warningLogFilePath}`);
          fs.writeFileSync(warningLogFilePath, warnings.join('\n') + '\n');
        }
      }
    },
    {
      description: `
    Rewrites HCL definitions to YAML definitions for Backstage.
  `,
      usage: [
        process.argv0,
        process.argv[1],
        '--input-folder </path/to/kibana-buildkite/pipelines>',
        '[--output-folder </path/to/output/folder>]',
        '[--output-location-file </path/to/output/location/file>]',
        '[--filter <file-path-filter>]',
      ].join(' '),
      flags: {
        allowUnexpected: true,
        string: ['input-folder', 'output-folder', 'output-location-file', 'filter'],
        help: `
    --input-folder          Path to the pipelines folder in the kibana-buildkite repo
    --output-folder         Path to the folder where the generated YAML files should be written to
    --output-location-file  Path to the location file that will contain the list of all generated YAML files
    --filter                A string to filter the files to process
  `,
      },
    }
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failure:', err);
    process.exit(1);
  });

function generateCatalogFile({
  tfFilePath,
  outputFolder,
  log,
}: {
  tfFilePath: string;
  outputFolder: string;
  log: ToolingLog;
}) {
  const catalogFileName = path.basename(tfFilePath, '.tf');
  const outputCatalogPath = path.resolve(outputFolder, `${catalogFileName}.yml`);

  const definitionObjectsAsJson = execSync(`hcl2json ${tfFilePath}`).toString();

  if (DRY_RUN) {
    const jsonFilePath = path.resolve(TMP_DIR, `${catalogFileName}.json`);
    fs.writeFileSync(jsonFilePath, definitionObjectsAsJson);
    log.info(`Written: ${jsonFilePath}`);
  }

  const tfModel = JSON.parse(definitionObjectsAsJson);
  if (!tfModel.resource) {
    log.warning(`No resources found in ${tfFilePath} - skipping`);
    return null;
  }
  const elasticBuildkiteResources = convertBuildkiteResources({ tfModel, log });

  if (!elasticBuildkiteResources) {
    log.warning(`One or more resources weren't successfully converted in ${tfFilePath} - skipping`);
    return null;
  }

  const yamlDoc = elasticBuildkiteResources
    .map((d) => SCHEMA_DEF + yaml.safeDump(d, DUMP_OPTIONS))
    .join('---\n');

  if (DRY_RUN) {
    const yamlFilePath = path.resolve(TMP_DIR, `${catalogFileName}.yml`);
    fs.writeFileSync(yamlFilePath, yamlDoc);
    log.info(`Written: ${yamlFilePath}`);
  } else {
    fs.writeFileSync(outputCatalogPath, yamlDoc);
    log.info(`Written: ${outputCatalogPath}`);
  }

  return outputCatalogPath;
}

function convertBuildkiteResources({
  tfModel,
  log,
}: {
  tfModel: Hcl2JsonModelForKibanaBuildkite;
  log: ToolingLog;
}) {
  const pipelines: Array<
    TypeWithExtraFields<{
      spec: TypeWithExtraFields<{ implementation: BuildkitePipelineManifest }>;
    }>
  > = [];
  const unconvertedPipelineSchedules: BuildkiteScheduleConfig[] = [];
  const webhooks: any[] = [];
  const failedExtractions: string[] = [];

  Object.entries(tfModel.resource).forEach(([resourceType, resource]) => {
    switch (resourceType) {
      case 'buildkite_pipeline':
        Object.entries(resource).forEach(([pipelineId, pipelineConfig]) => {
          const convertedPipeline = convertBuildkitePipeline(pipelineId, pipelineConfig[0], log);
          if (convertedPipeline) {
            pipelines.push(convertedPipeline);
          } else {
            failedExtractions.push(pipelineId);
          }
        });
        break;
      case 'buildkite_pipeline_schedule':
        Object.entries(resource).forEach(([scheduleName, pipelineSchedule]) => {
          unconvertedPipelineSchedules.push(pipelineSchedule[0] as BuildkiteScheduleConfig);
        });
        break;
      case 'github_repository_webhook':
        webhooks.push(resource);
        break;
      default:
        log.warning('Ignoring unknown resource type: ' + resourceType);
    }
  });

  unconvertedPipelineSchedules.forEach((pipelineSchedule) => {
    const targetPipelineName = pipelineSchedule.pipeline_id?.match(
      /buildkite_pipeline\.([^.]+).id/
    )?.[1];
    const pipelineCandidate = pipelines.find((p) => p.pipelineId === targetPipelineName);

    if (!pipelineCandidate) {
      log.warning(
        `Could not find pipeline for schedule '${pipelineSchedule.pipeline_id}' - skipping`
      );
      return;
    } else if (!pipelineCandidate.spec.implementation.spec) {
      log.warning(
        `Pipeline '${pipelineSchedule.pipeline_id}' does not have a spec - skipping schedule`
      );
      return;
    } else if (!pipelineCandidate.spec.implementation.spec.schedules) {
      pipelineCandidate.spec.implementation.spec.schedules = {};
    }

    const branch = pipelineSchedule.branch?.match(/\${buildkite_pipeline\..*\.default_branch}/)
      ? pipelineCandidate.spec.implementation.spec.default_branch
      : pipelineSchedule.branch;

    pipelineCandidate.spec.implementation.spec.schedules = expandSchedule(
      {
        cronline: pipelineSchedule.cronline,
        message: pipelineSchedule.label,
        env: pipelineSchedule.env,
        branch: branch || 'main',
        for_each: pipelineSchedule.for_each,
      },
      getLocal()
    );
  });

  // TODO: webhooks

  if (failedExtractions.length > 0) {
    log.warning(
      `The following pipelines could not be converted due to various errors:\n${failedExtractions}`
    );
    return null;
  }

  // This is a temporary field, to match schedules
  pipelines.forEach((pipeline) => {
    delete pipeline.pipelineId;
  });
  return pipelines;
}

// We can use this function to provide the defaults we had from the terraform+buildkite setup over the backstage defaults
function valueOrDefault(value: any, defaultValue: any) {
  return value === undefined ? defaultValue : value;
}

function renameField(fieldName: string, newFieldName: string, obj: any) {
  if (Object.hasOwn(obj, fieldName)) {
    obj[newFieldName] = obj[fieldName];
    delete obj[fieldName];
  }
  return obj;
}

function slugify(str: string) {
  return str.replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase();
}

function makeCanonicalPipelineId(pipelineSlug: string) {
  let canonicalPipelineId = `bk-` + pipelineSlug;
  if (canonicalPipelineId.length > 63) {
    canonicalPipelineId = canonicalPipelineId + '-TOO-LONG-FIND-SOMETHING-SHORTER!';
  }
  return canonicalPipelineId;
}

function convertBuildkitePipeline(
  pipelineId: string,
  pipeline: BuildkitePipelineConfig,
  log: ToolingLog
): TypeWithExtraFields<{
  spec: TypeWithExtraFields<{ implementation: BuildkitePipelineManifest }>;
}> | null {
  const { env, pipelineFile, accuracy } = extractOrGeneratePipelineFile(pipeline.steps, log);

  if (accuracy < 0.75) {
    log.warning(
      `Extracted pipeline file accuracy for '${pipelineId}' is less than 75% (${accuracy}) - skipping`
    );
    return null;
  } else if (Object.hasOwn(pipeline, 'for_each')) {
    log.warning(
      `Skipping pipeline '${pipelineId}' because it uses a for_each block, you'll need manual expansion`
    );
    return null;
  }

  const providerSettings = pipeline.provider_settings?.[0] || {};

  const pipelineSlug = slugify(pipeline.name);
  const canonicalPipelineId = makeCanonicalPipelineId(pipelineSlug);

  const teams = pipeline.team.reduce(
    (acc, team) => ({ ...acc, [team.slug]: { access_level: team.access_level } }),
    {} as Record<string, { access_level: string }>
  );

  // https://github.com/elastic/kibana-operations/issues/41
  ['kibana-operations', 'appex-qa', 'kibana-tech-leads'].forEach((team) => {
    if (!teams[team]) {
      teams[team] = { access_level: 'MANAGE_BUILD_AND_READ' };
    }
  });
  teams.everyone = { access_level: 'BUILD_AND_READ' };

  const pipelineObj = {
    pipelineId,
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Resource',
    metadata: {
      name: canonicalPipelineId,
      description: pipeline.description,
      links: [
        {
          url: `https://buildkite.com/elastic/${pipelineSlug}`,
          title: 'Pipeline link',
        },
      ],
    },
    spec: {
      type: 'buildkite-pipeline',
      owner: 'group:kibana-operations', // TODO: try to associate to other owners
      system: 'buildkite',
      implementation: {
        apiVersion: 'buildkite.elastic.dev/v1',
        kind: 'Pipeline',
        metadata: {
          name: pipeline.name,
          description: pipeline.description,
        },
        spec: {
          env: renameField(
            'SLACK_NOTIFICATIONS_ENABLED',
            'ELASTIC_SLACK_NOTIFICATIONS_ENABLED',
            env
          ),
          allow_rebuilds: valueOrDefault(pipeline.allow_rebuilds, true),
          branch_configuration: pipeline.branch_configuration,
          cancel_intermediate_builds: pipeline.cancel_intermediate_builds,
          default_branch: pipeline.default_branch,
          // name is in metadata
          // description is in metadata
          repository: trimRepo(pipeline.repository),
          pipeline_file: pipelineFile, // instead of steps
          skip_intermediate_builds: valueOrDefault(pipeline.skip_intermediate_builds, false),

          provider_settings: {
            build_branches: providerSettings.build_branches,
            build_pull_requests: providerSettings.build_pull_requests,
            publish_commit_status: providerSettings.publish_commit_status,
            trigger_mode: providerSettings.trigger_mode,
            build_tags: providerSettings.build_tags,
            prefix_pull_request_fork_branch_names: valueOrDefault(
              providerSettings.prefix_pull_request_fork_branch_names,
              false
            ),
            skip_pull_request_builds_for_existing_commits: valueOrDefault(
              providerSettings.skip_builds_for_existing_commits,
              false
            ),
          },
          teams,
        },
      },
    },
  };

  return expandAnyObjectValue(pipelineObj);
}

function extractOrGeneratePipelineFile(
  pipelineStepsStr: string,
  log: ToolingLog
): {
  env: Record<string, string> | null;
  pipelineFile: string | null;
  accuracy: number;
} {
  const pipelineDefObj = yaml.load(pipelineStepsStr);
  const command = pipelineDefObj.steps?.[0]?.command;

  if (!command) {
    log.warning('No command found in pipeline definition, skipping');
    return { env: null, pipelineFile: null, accuracy: 0 };
  }

  const env = pipelineDefObj.env || null;
  const pipelineFile: string | null =
    command.match(/pipeline\s+upload\s+(\S+)($|\n)/)?.[1] || command.match(/(\S+.sh)($|\n)/)?.[1];

  if (!pipelineFile) {
    log.warning('No pipeline file found in pipeline definition, skipping');
    return { env, pipelineFile: null, accuracy: 0 };
  }

  // This is a silly Jaccard similarity-like heuristic, but for now it's good enough
  const recreatedPipelineDef = yaml.safeDump(
    {
      env: env || undefined,
      steps: [
        {
          label: pipelineDefObj.steps?.[0]?.label || ':pipeline: Pipeline upload',
          command: pipelineFile.endsWith('.sh')
            ? pipelineFile
            : `buildkite-agent pipeline upload ${pipelineFile}`,
          agents: {
            queue: 'kibana-default',
          },
        },
      ],
    },
    DUMP_OPTIONS
  );
  const recreatedPipelineWords = new Set(recreatedPipelineDef.split(' ').map((w) => w.trim()));
  const originalPipelineWords = new Set(pipelineStepsStr.split(' ').map((w) => w.trim()));
  const wordOverlap = [...recreatedPipelineWords].filter((word) => originalPipelineWords.has(word));
  const accuracy = wordOverlap.length / originalPipelineWords.size;

  return {
    env:
      (env && Object.keys(env).reduce((o, k) => ({ ...o, [k]: String(env[k]) }), {})) || undefined,
    pipelineFile,
    accuracy,
  };
}

function compileLocationFile({
  locationFilePath,
  log,
}: {
  locationFilePath: string;
  log: ToolingLog;
}): string {
  if (!fs.existsSync(locationFilePath)) {
    const locationFileContent = yaml.safeDump(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Location',
        metadata: {
          name: 'kibana-buildkite-pipelines-list',
          description: 'This file points to individual buildkite pipeline definition files',
        },
        spec: {
          type: 'url',
          targets: [],
        },
      },
      DUMP_OPTIONS
    );

    if (DRY_RUN) {
      const tempLocationPath = path.resolve(TMP_DIR, 'locations.yml');
      fs.writeFileSync(tempLocationPath, locationFileContent);
      log.info(`Written: ${tempLocationPath}`);
    } else {
      fs.writeFileSync(locationFilePath, locationFileContent);
      log.info(`Written: ${locationFilePath}`);
    }
  }

  const regenerationScript = path.resolve(
    path.dirname(locationFilePath),
    'fix-location-collection.ts'
  );
  execSync(`ts-node ${regenerationScript}`, { stdio: 'inherit' });

  return path.relative(REPO_ROOT, locationFilePath);
}

function updateCatalogLocationInCatalogInfo({
  catalogLocationFilePath,
  log,
}: {
  catalogLocationFilePath: string;
  log: ToolingLog;
}) {
  const catalogInfoFilePath = path.resolve(REPO_ROOT, 'catalog-info.yaml');
  const catalogInfoFileContent = fs.readFileSync(catalogInfoFilePath, 'utf-8');
  const catalogLocationFileRelativePath = path.relative(REPO_ROOT, catalogLocationFilePath);
  const catalogLocationUrl = `${REPO_FILES_PREFIX}/${catalogLocationFileRelativePath}`;

  const editedCatalogInfoFile = catalogInfoFileContent
    .split('\n')
    .map((line) => {
      if (line.includes('# Auto-updated')) {
        const indent = line.match(/^\s+/)?.[0] || '';
        const comment = line.match(/# Auto-updated.*$/)?.[0] || '';
        return `${indent}target: ${catalogLocationUrl} ${comment}`;
      } else {
        return line;
      }
    })
    .join('\n');

  if (DRY_RUN) {
    const tempCatalogInfoPath = path.resolve(TMP_DIR, 'catalog-info.yml');
    fs.writeFileSync(tempCatalogInfoPath, editedCatalogInfoFile);
    log.info(`Written: ${tempCatalogInfoPath}`);
  } else {
    fs.writeFileSync(catalogInfoFilePath, editedCatalogInfoFile);
    log.info(`Written: ${catalogInfoFilePath}`);
  }
}

function assertHclToJsonIsInstalled() {
  try {
    execSync('hcl2json --version');
  } catch (err) {
    throw new Error('hcl2json is not installed. Install it with `brew install hcl2json`');
  }
}

function trimRepo(repository: string) {
  return repository.match(/github.com\/([^/]+\/[^/.]+)(\.git)?$/)?.[1] || repository;
}

function expandSchedule(
  scheduleObj: Omit<BuildkiteScheduleConfig, 'label'> & { message?: string },
  env: any,
  postfix: string = ''
) {
  const resultingSchedules: Record<string, any> = {};

  const fields: Array<keyof typeof scheduleObj> = Object.keys(scheduleObj).filter(
    (k) => k !== 'pipeline_id' && k !== 'for_each'
  ) as any;

  if (scheduleObj.for_each) {
    const iterable = evaluateExpressionInContext(scheduleObj.for_each, env);

    for (const item of iterable) {
      const result = expandSchedule(
        { ...scheduleObj, for_each: undefined },
        { ...env, each: { value: item } },
        item
      );
      Object.assign(resultingSchedules, result);
    }
  } else {
    for (const field of fields) {
      if (typeof scheduleObj[field] === 'string' && scheduleObj[field].startsWith('${')) {
        scheduleObj[field] = evaluateExpressionInContext(scheduleObj[field], env);
      }
    }
    const scheduleName = postfix ? `${scheduleObj.message} (${postfix})` : scheduleObj.message;
    resultingSchedules[scheduleName || 'default schedule'] = scheduleObj;
  }

  return resultingSchedules;
}

function evaluateExpressionInContext(expr: string, env: any) {
  // @ts-ignore
  const setsubtract = (arr: any[], toRemove: any[]) => arr.filter((e) => !toRemove.includes(e));
  // @ts-ignore
  const join = (token: string, array: any[]) => array.join(token);
  const toset = (arr: any[]) => [...new Set(arr)];
  // @ts-ignore
  const setunion = (...arrays: any[][]) => toset(arrays.flat());

  const local = env;
  // @ts-ignore
  const each = local.each;

  try {
    // eslint-disable-next-line no-eval
    return eval(expr.replace(/\${/g, '').replace(/}/g, ''));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to expand: ' + expr, local, e);
    throw e;
  }
}

function getLocal() {
  const local = {
    get kibana_versions() {
      return JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, 'versions.json')).toString())
        .versions as Array<{
        version: string;
        branch: string;
        currentMajor: boolean;
        currentMinor: boolean;
      }>;
    },
    get kibana_branches() {
      return Object.values(local.kibana_versions).map((v) => v.branch);
    },
    get kibana_previous_major() {
      return Object.values(local.kibana_versions).find((v) => v.hasOwnProperty('previousMajor'));
    },
    get kibana_current_majors() {
      return Object.values(local.kibana_versions).filter((v) => v.hasOwnProperty('currentMajor'));
    },
    get current_dev_branches() {
      return local.kibana_branches;
    },
    get current_staging_branches() {
      return local.kibana_branches.filter((branch) => branch !== 'main');
    },
  };
  return local;
}

function expandAnyObjectValue(input: object) {
  return JSON.parse(JSON.stringify(input), (key, value) => {
    if (typeof value === 'string' && value.startsWith('${')) {
      return evaluateExpressionInContext(value, getLocal());
    } else {
      return value;
    }
  });
}
