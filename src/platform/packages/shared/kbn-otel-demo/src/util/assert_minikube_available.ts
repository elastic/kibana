/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export async function ensureMinikubeRunning(): Promise<void> {
  try {
    const { stdout } = await execa.command('minikube status --format={{.Host}}');
    if (stdout.trim() === 'Running') {
      return; // Already running
    }
  } catch {
    // Not running or not started
  }

  // Start minikube
  await execa.command('minikube start --driver=docker --memory=4096 --cpus=4', {
    stdio: 'inherit',
  });
}

/**
 * Gets the minikube IP address
 */
export async function getMinikubeIp(): Promise<string> {
  const { stdout } = await execa.command('minikube ip');
  return stdout.trim();
}

/**
 * Waits for all pods in a namespace to be ready
 */
export async function waitForPodsReady(namespace: string, timeoutSeconds = 300): Promise<void> {
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const { stdout } = await execa.command(
        `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.phase}'`
      );
      const phases = stdout.replace(/'/g, '').trim().split(' ').filter(Boolean);

      if (phases.length > 0 && phases.every((phase) => phase === 'Running')) {
        // Check if all containers are ready
        const { stdout: readyOutput } = await execa.command(
          `kubectl get pods -n ${namespace} -o jsonpath='{.items[*].status.containerStatuses[*].ready}'`
        );
        const readyStates = readyOutput.replace(/'/g, '').trim().split(' ').filter(Boolean);

        if (readyStates.length > 0 && readyStates.every((ready) => ready === 'true')) {
          return;
        }
      }
    } catch {
      // Pods might not exist yet
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timeout waiting for pods in namespace ${namespace} to be ready`);
}

/**
 * Deletes a namespace and all its resources
 */
export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    await execa.command(`kubectl delete namespace ${namespace} --ignore-not-found`);
  } catch {
    // Ignore errors
  }
}
