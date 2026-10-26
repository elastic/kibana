/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorSpecHasEvents, connectorsSpecs } from '.';
import { getPackagedConnectorEvents, packagedConnectorEvents } from './events';

const SEP = __dirname.includes('\\') ? '\\' : '/';

const getPkgDir = (): string => {
  const eventsPath = require.resolve('./events');
  return eventsPath.slice(0, eventsPath.lastIndexOf(SEP));
};

const ALLOWED_SPEC_SIBLINGS = new Set(['events', 'event_schemas', 'constants', 'types']);

/** True for `src/specs/<name>/<name>.ts` main spec modules. Sibling helpers are allowed. */
const isMainSpecModule = (modulePath: string, specsDir: string): boolean => {
  if (!modulePath.startsWith(specsDir) || !modulePath.endsWith('.ts')) {
    return false;
  }

  const relative = modulePath.slice(specsDir.length);
  const parts = relative.split(SEP);
  const fileName = parts[parts.length - 1];
  const baseName = fileName.slice(0, -'.ts'.length);
  if (ALLOWED_SPEC_SIBLINGS.has(baseName)) {
    return false;
  }

  const parentDir = parts[parts.length - 2];
  return parentDir === baseName;
};

describe('@kbn/connector-specs/events', () => {
  describe('module-load boundary', () => {
    beforeEach(() => {
      jest.resetModules();
      const pkgDir = getPkgDir();
      for (const modulePath of Object.keys(require.cache)) {
        if (modulePath === __filename || !modulePath.startsWith(`${pkgDir}${SEP}`)) {
          continue;
        }
        delete require.cache[modulePath];
      }
    });

    it('does not load the specs barrel or any main spec module', () => {
      const pkgDir = getPkgDir();
      const allSpecsPath = require.resolve('./src/all_specs');
      const specsDir = `${pkgDir}${SEP}src${SEP}specs${SEP}`;

      require('./events');

      const loadedForbidden = Object.keys(require.cache).filter(
        (modulePath) => modulePath === allSpecsPath || isMainSpecModule(modulePath, specsDir)
      );
      expect(loadedForbidden).toEqual([]);
    });
  });

  describe('sync with specs that declare events', () => {
    const specsWithEvents = Object.values(connectorsSpecs).filter(connectorSpecHasEvents);

    it('keys match the specs that declare events', () => {
      expect(Object.keys(packagedConnectorEvents).sort()).toEqual(
        specsWithEvents.map((spec) => spec.metadata.id).sort()
      );
    });

    it('returns the same events object as the spec', () => {
      for (const spec of specsWithEvents) {
        expect(packagedConnectorEvents[spec.metadata.id]).toBe(spec.events);
      }
    });

    it('returns undefined for an unknown type', () => {
      expect(getPackagedConnectorEvents('.not-a-spec')).toBeUndefined();
    });
  });
});
