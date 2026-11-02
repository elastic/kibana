/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

/**
 * Checks if minikube is installed and running.
 * @throws Error if minikube is not available or not running
 */
export async function assertMinikubeAvailable(): Promise<void> {
  try {
    await execa.command('minikube version');
  } catch (error) {
    throw new Error(
      'minikube is not installed. Please install minikube: https://minikube.sigs.k8s.io/docs/start/'
    );
  }

  try {
    const { stdout } = await execa.command('minikube status --format={{.Host}}');
    if (stdout.trim() !== 'Running') {
      throw new Error('not running');
    }
  } catch (error) {
    throw new Error(
      'minikube is not running. Please start minikube with: minikube start --driver=docker'
    );
  }
}

/**
 * Checks if kubectl is available
 */
export async function assertKubectlAvailable(): Promise<void> {
  try {
    await execa.command('kubectl version --client');
  } catch (error) {
    throw new Error('kubectl is not installed. Please install kubectl.');
  }
}

/**
 * Starts minikube if not already running
 */
export async function ensureMinikubeRunning(log?: ToolingLog): Promise<void> {
  try {
    const { stdout } = await execa.command('minikube status --format={{.Host}}');
    if (stdout.trim() === 'Running') {
      log?.info('minikube is already running');
      return;
    }
  } catch {
    // Not running or not started
  }

  log?.info('Starting minikube (--cpus=4 --memory=4096) — this may take a minute...');
  await execa.command('minikube start --driver=docker --memory=4096 --cpus=4', {
    stdio: 'inherit',
  });
  log?.info('minikube started');
}

/**
 * Gets the minikube IP address
 */
export async function getMinikubeIp(): Promise<string> {
  const { stdout } = await execa.command('minikube ip');
  return stdout.trim();
}

/**
 * Resolves the IP address for host.minikube.internal from minikube's /etc/hosts.
 * Pods use CoreDNS which doesn't resolve this hostname, so the IP is needed
 * for hostAliases in pod specs that need to reach the host machine.
 */
export async function getMinikubeHostGatewayIp(): Promise<string | undefined> {
  try {
    const { stdout } = await execa('minikube', ['ssh', 'grep host.minikube.internal /etc/hosts']);
    const ip = stdout.trim().split(/\s+/)[0];
    return ip || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Waits for all pods in a namespace to be ready
 */
export async function waitForPodsReady(
  namespace: string,
  options?: { timeoutSeconds?: number; pollIntervalMs?: number; log?: ToolingLog }
): Promise<void> {
  const timeoutSeconds = options?.timeoutSeconds ?? 600;
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const log = options?.log;

  log?.info(`Waiting for pods in namespace "${namespace}" to be ready...`);
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const { stdout } = await execa.command(
        `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.phase}'`
      );
      const phases = stdout.replace(/'/g, '').trim().split(' ').filter(Boolean);

      if (phases.length > 0 && phases.every((phase) => phase === 'Running')) {
        const { stdout: readyOutput } = await execa.command(
          `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.containerStatuses[*].ready}'`
        );
        const readyStates = readyOutput.replace(/'/g, '').trim().split(' ').filter(Boolean);

        if (readyStates.length > 0 && readyStates.every((ready) => ready === 'true')) {
          log?.info('All pods ready');
          return;
        }
      }
    } catch {
      // Pods might not exist yet
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timeout (${timeoutSeconds}s) waiting for pods in namespace ${namespace} to be ready`
  );
}

/**
 * Deletes a namespace and all its resources
 */
export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    await execa
      .command(
        `kubectl delete deployments --all -n ${namespace} --grace-period=0 --ignore-not-found`
      )
      .catch(() => {});
    await execa
      .command(
        `kubectl delete pods --all -n ${namespace} --force --grace-period=0 --ignore-not-found`
      )
      .catch(() => {});
    await execa.command(`kubectl delete namespace ${namespace} --ignore-not-found`);
  } catch {
    // Ignore errors
  }
}
