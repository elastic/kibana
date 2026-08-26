/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { defaultKibanaIndex } from '@kbn/migrator-test-kit';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { Task, TaskContext } from '../types';
import { classifyUpdatedTypes, validateChangesExistingType, gcsSnapshotUrl } from '../../snapshots';
import { isSavedObjectsCheckError, SavedObjectsCheckError } from '../../findings';
import { getLatestTypeFixtures } from '../../migrations/fixtures';
import { getVersions } from '../../migrations';

/**
 * Catches any SavedObjectsCheckError thrown by `fn` and re-throws it with
 * each finding annotated with the snapshot URL that was used as a baseline.
 * Plain errors (programming bugs, I/O failures) are re-thrown as-is.
 *
 * Typed as async so that if `validateChangesExistingType` is ever made async,
 * the returned Promise is awaited rather than silently dropped.
 */
const withBaselineContext = async (
  url: string | undefined,
  isServerless: boolean,
  fn: () => void | Promise<void>
): Promise<void> => {
  if (!url) {
    await fn();
    return;
  }
  try {
    await fn();
  } catch (err) {
    if (!isSavedObjectsCheckError(err)) throw err;
    const field = isServerless ? ('serverlessBaselineUrl' as const) : ('baselineUrl' as const);
    throw new SavedObjectsCheckError(err.findings.map((f) => ({ ...f, [field]: url })));
  }
};

export const validateUpdatedTypes: Task = (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: 'Detecting updated types',
      task: () => {
        const { updatedTypes: updatedList, typesWithNewModelVersions: withNewModelVersionList } =
          classifyUpdatedTypes({ from: ctx.from!, to: ctx.to! });
        const toMigratorIndex = (type: SavedObjectsType<any>) => ({
          ...type,
          indexPattern: defaultKibanaIndex,
        });
        ctx.updatedTypes = ctx
          .registeredTypes!.filter(({ name }) => updatedList.includes(name))
          .map(toMigratorIndex);
        ctx.typesWithNewModelVersions = ctx
          .registeredTypes!.filter(({ name }) => withNewModelVersionList.includes(name))
          .map(toMigratorIndex);
      },
    },
    {
      title: 'Validating changes in updated types',
      task: (_, subtask) => {
        const validateChangesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes.map(
          (registeredType) => ({
            title: `Checking updates on type '${registeredType.name}'`,
            task: (__, typeTask) =>
              withBaselineContext(gcsSnapshotUrl(ctx.gitRev), false, () =>
                validateChangesExistingType({
                  from: ctx.from!.typeDefinitions[registeredType.name],
                  to: ctx.to?.typeDefinitions[registeredType.name]!,
                  registeredType,
                  log: (msg) => (typeTask.output = msg),
                })
              ),
          })
        );

        return subtask.newListr<TaskContext>(validateChangesTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => ctx.updatedTypes.length === 0,
    },
    {
      title: 'Validating updated types against current serverless baseline',
      task: (_, subtask) => {
        const validateChangesTasks: ListrTask<TaskContext>[] = ctx.updatedTypes
          .filter(({ name }) => Boolean(ctx.serverlessFrom!.typeDefinitions[name]))
          .map((registeredType) => ({
            title: `Checking updates on type '${registeredType.name}' against serverless baseline`,
            task: (__, typeTask) =>
              withBaselineContext(gcsSnapshotUrl(ctx.serverlessGitRev), true, () =>
                validateChangesExistingType({
                  from: ctx.serverlessFrom!.typeDefinitions[registeredType.name],
                  to: ctx.to?.typeDefinitions[registeredType.name]!,
                  registeredType,
                  log: (msg) => (typeTask.output = msg),
                })
              ),
          }));

        return subtask.newListr<TaskContext>(validateChangesTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => !ctx.serverlessFrom || ctx.updatedTypes.length === 0,
    },
    {
      title: 'Verifying fixtures for updated types',
      task: (_, subtask) => {
        const loadFixturesTasks: ListrTask<TaskContext>[] = ctx.typesWithNewModelVersions.map(
          (type) => {
            const { name } = type;
            return {
              title: `Loading fixtures for type '${name}'`,
              task: async (__, loadFixturesTask) => {
                const [current, previous] = getVersions(ctx.to!.typeDefinitions[name]);
                const typeFixtures = await getLatestTypeFixtures({
                  type,
                  current,
                  previous,
                  fix: ctx.fix,
                });
                ctx.fixtures.previous[name] = typeFixtures.previous;
                ctx.fixtures.current[name] = typeFixtures.current;
                loadFixturesTask.title += `: ${typeFixtures.current.relativePath}`;
              },
            };
          }
        );
        return subtask.newListr<TaskContext>(loadFixturesTasks, {
          exitOnError: false,
          rendererOptions: { showErrorMessage: true },
        });
      },
      skip: () => ctx.typesWithNewModelVersions.length === 0,
    },
  ];
  return task.newListr<TaskContext>(subtasks);
};
