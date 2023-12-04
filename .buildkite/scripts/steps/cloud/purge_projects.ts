/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import axios from 'axios';

async function getPrProjects() {
  const match = /^kibana-pr-([0-9]+)-(elasticsearch|security|observability)$/;
  try {
    return (
      await Promise.all([
        projectRequest.get('/api/v1/serverless/projects/elasticsearch'),
        projectRequest.get('/api/v1/serverless/projects/security'),
        projectRequest.get('/api/v1/serverless/projects/observability'),
      ])
    )
      .map((response) => response.data.items)
      .flat()
      .filter((project) => project.name.match(match))
      .map((project) => {
        const [, prNumber, projectType] = project.name.match(match);
        return {
          id: project.id,
          name: project.name,
          prNumber,
          type: projectType,
        };
      });
  } catch (e) {
    if (e.isAxiosError) {
      const message = JSON.stringify(e.response.data) || 'unable to fetch projects';
      throw new Error(message);
    }
    throw e;
  }
}

async function deleteProject({
  type,
  id,
}: {
  type: 'elasticsearch' | 'observability' | 'security';
  id: number;
}) {
  try {
    await projectRequest.delete(`/api/v1/serverless/projects/${type}/${id}`);
  } catch (e) {
    if (e.isAxiosError) {
      const message =
        JSON.stringify(e.response.data) || `unable to delete ${type} project with id ${id}`;
      throw new Error(message);
    }
    throw e;
  }
}

async function purgeProjects() {
  const prProjects = await getPrProjects();
  const projectsToPurge = [];
  for (const project of prProjects) {
    const NOW = new Date().getTime() / 1000;
    const DAY_IN_SECONDS = 60 * 60 * 24;
    const prJson = execSync(
      `gh pr view '${project.prNumber}' --json state,labels,updatedAt`
    ).toString();
    const pullRequest = JSON.parse(prJson);
    const prOpen = pullRequest.state === 'OPEN';
    const lastCommitTimestamp = new Date(pullRequest.updatedAt).getTime() / 1000;

    const persistDeployment = Boolean(
      pullRequest.labels.filter((label: any) => label.name === 'ci:project-persist-deployment')
        .length
    );
    if (prOpen && persistDeployment) {
      continue;
    }

    if (!prOpen) {
      console.log(
        `Pull Request #${project.prNumber} is no longer open, will delete associated ${project.type} project`
      );
      projectsToPurge.push(project);
    } else if (
      !Boolean(
        pullRequest.labels.filter((label: any) =>
          /^ci:project-deploy-(elasticearch|security|observability)$/.test(label.name)
        ).length
      )
    ) {
      console.log(
        `Pull Request #${project.prNumber} no longer has a project deployment label, will delete associated deployment`
      );
      projectsToPurge.push(project);
    } else if (lastCommitTimestamp < NOW - DAY_IN_SECONDS * 2) {
      console.log(
        `Pull Request #${project.prNumber} has not been updated in more than 2 days, will delete associated deployment`
      );
      projectsToPurge.push(project);
    }
  }
  await Promise.all(projectsToPurge.map((p) => deleteProject(p)));
}

if (!process.env.PROJECT_API_DOMAIN || !process.env.PROJECT_API_KEY) {
  console.error('missing project authentication');
  process.exit(1);
}
const projectRequest = axios.create({
  baseURL: process.env.PROJECT_API_DOMAIN,
  headers: {
    Authorization: `ApiKey ${process.env.PROJECT_API_KEY}`,
  },
});

purgeProjects().catch((e) => {
  console.error(e.toString());
  process.exitCode = 1;
});
