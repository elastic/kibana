/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { vaultRead } from './vault';
import type { Manifest, ManifestSecretField, ResolvedManifest } from './types';

const MANIFESTS_DIR = path.resolve(__dirname, '../manifests');

/**
 * Loads all YAML manifest files from the manifests directory.
 */
export function loadManifests(manifestsDir: string = MANIFESTS_DIR): Manifest[] {
  const files = fs.readdirSync(manifestsDir).filter((f) => f.endsWith('.yaml'));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(manifestsDir, file), 'utf-8');
    const manifest = yaml.load(content) as Manifest;
    validate(manifest, file);
    return manifest;
  });
}

function validate(manifest: Manifest, filename: string): void {
  if (!manifest.spec_id) throw new Error(`Manifest ${filename}: missing spec_id`);
  if (!manifest.name) throw new Error(`Manifest ${filename}: missing name`);
  if (!manifest.auth_type) throw new Error(`Manifest ${filename}: missing auth_type`);
  if (!manifest.secrets || typeof manifest.secrets !== 'object') {
    throw new Error(`Manifest ${filename}: missing or invalid secrets`);
  }
}

async function resolveSecretField(
  name: string,
  field: ManifestSecretField | null | undefined,
  manifestName: string
): Promise<string> {
  if (field == null) {
    throw new Error(
      `Secret "${name}" in manifest "${manifestName}" has no value. Either provide a "value" or a "vault" + "field" pair, or remove the key.`
    );
  }

  if (field.value !== undefined) {
    return field.value;
  }

  if (field.vault && field.field) {
    return vaultRead(field.vault, field.field);
  }

  throw new Error(
    `Secret "${name}" in manifest "${manifestName}" must have either a "value" or a "vault" + "field" pair.`
  );
}

/**
 * Resolves all secrets in a manifest by fetching vault values.
 * Adds the `authType` discriminator to the secrets object.
 */
export async function resolveManifestSecrets(manifest: Manifest): Promise<ResolvedManifest> {
  const resolvedSecrets: Record<string, string> = {
    authType: manifest.auth_type,
  };

  for (const [secretName, secretField] of Object.entries(manifest.secrets)) {
    resolvedSecrets[secretName] = await resolveSecretField(secretName, secretField, manifest.name);
  }

  return {
    specId: manifest.spec_id,
    name: manifest.name,
    authType: manifest.auth_type,
    config: manifest.config ?? {},
    secrets: resolvedSecrets,
  };
}
