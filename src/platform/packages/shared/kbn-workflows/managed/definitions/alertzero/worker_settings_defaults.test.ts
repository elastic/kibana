/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS,
  CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS,
  nearestLowerAutonomyLevel,
  RULE_TUNING_WORKER_SETTINGS_DEFAULTS,
  upgradeStoredWorkerSettings,
} from './worker_settings_defaults';

const RULE_TUNING_EXTRAS = RULE_TUNING_WORKER_SETTINGS_DEFAULTS.extras.defaultValue;

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

describe('upgradeStoredWorkerSettings', () => {
  const stored = {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '2h',
  };

  it('Rule Tuning permits only Manual/Assisted and lowers stored Supervised to Assisted', () => {
    expect(RULE_TUNING_WORKER_SETTINGS_DEFAULTS.allowedAutonomyLevels).toEqual([
      'manual',
      'assisted',
    ]);
    expect(
      upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, {
        ...stored,
        autonomyLevel: 'supervised',
      }).autonomyLevel
    ).toBe('assisted');
  });

  it('fills extras when the document has none', () => {
    expect(upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, stored)).toEqual({
      ...stored,
      extras: RULE_TUNING_EXTRAS,
    });
  });

  it('fills only extras keys the document does not have', () => {
    expect(
      upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, {
        ...stored,
        extras: { analysisWindowDays: 21 },
      })
    ).toEqual({
      ...stored,
      extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 21 },
    });
  });

  it('keeps a present extras value that is out of range', () => {
    const invalid = { ...stored, extras: { analysisWindowDays: 0 } };

    expect(upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, invalid)).toEqual({
      ...invalid,
      extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 0 },
    });
  });

  it('returns the same object when the document already matches the defaults', () => {
    const complete = { ...stored, extras: { ...RULE_TUNING_EXTRAS } };

    expect(upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, complete)).toBe(
      complete
    );
  });

  it('fills a missing schedule interval from the default', () => {
    const withoutInterval = { settingsVersion: 1, autonomyLevel: 'manual' };

    expect(
      upgradeStoredWorkerSettings(ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS, withoutInterval)
    ).toEqual({ ...withoutInterval, scheduleInterval: '24h' });
  });

  it('drops a stored extras value once the Worker declares none', () => {
    const staleExtras = { ...stored, extras: { tier2When: 'always', candidateLimit: 10 } };

    expect(
      upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS, staleExtras)
    ).toEqual(stored);
  });

  it('leaves a document with no extras alone when the Worker declares none', () => {
    expect(
      upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS, stored)
    ).toBe(stored);
  });

  it('never modifies the stored values it is given', () => {
    const documents = [
      { settingsVersion: 1, autonomyLevel: 'supervised' },
      { ...stored, autonomyLevel: 'supervised', extras: { analysisWindowDays: 21 } },
      { ...stored, extras: { tier2When: 'always' } },
    ];
    for (const document of documents) {
      const before = JSON.stringify(document);
      const frozen = deepFreeze(structuredClone(document));
      upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, frozen);
      upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS, frozen);
      expect(JSON.stringify(frozen)).toBe(before);
    }
  });

  describe('autonomy the Worker no longer allows', () => {
    const complete = { ...stored, extras: { ...RULE_TUNING_EXTRAS } };

    it('lowers it to the nearest allowed level below', () => {
      expect(
        upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, {
          ...complete,
          autonomyLevel: 'supervised',
        })
      ).toEqual({ ...complete, autonomyLevel: 'assisted' });
      expect(
        upgradeStoredWorkerSettings(ATTACK_DISCOVERY_WORKER_SETTINGS_DEFAULTS, {
          settingsVersion: 1,
          autonomyLevel: 'assisted',
          scheduleInterval: '24h',
        })
      ).toEqual({ settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '24h' });
    });

    it('keeps a level with nothing allowed below it, for validation to reject', () => {
      const document = { settingsVersion: 1, autonomyLevel: 'manual' };

      expect(upgradeStoredWorkerSettings({ allowedAutonomyLevels: ['assisted'] }, document)).toBe(
        document
      );
    });

    it('keeps a value outside the shared scale, for validation to reject', () => {
      const document = { ...complete, autonomyLevel: 'yolo' };

      expect(upgradeStoredWorkerSettings(RULE_TUNING_WORKER_SETTINGS_DEFAULTS, document)).toBe(
        document
      );
    });
  });
});

describe('nearestLowerAutonomyLevel', () => {
  it('picks the most autonomous allowed level strictly below, in any declared order', () => {
    expect(nearestLowerAutonomyLevel(['assisted', 'manual'], 'supervised')).toBe('assisted');
    expect(nearestLowerAutonomyLevel(['manual', 'supervised'], 'assisted')).toBe('manual');
  });

  it('never goes up', () => {
    expect(nearestLowerAutonomyLevel(['assisted', 'supervised'], 'manual')).toBeUndefined();
  });
});
