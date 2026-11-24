/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import {
  parseStepContract,
  readFileFromGit,
  readStepContractsFromDir,
  readStepContractsFromGit,
  serializeStepContract,
  writeStepContracts,
  type StepContract,
} from './step_contracts';

const createContract = (id: string, overrides: Partial<StepContract> = {}): StepContract => ({
  id,
  stability: 'tech_preview',
  exposure: 'open',
  input: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  output: { type: 'object', properties: {} },
  ...overrides,
});

describe('step contracts', () => {
  let dir: string;

  beforeEach(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'wf-step-contracts-'));
  });

  afterEach(() => {
    Fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('parseStepContract', () => {
    it('returns the contract', () => {
      const contract = createContract('ns.step', { config: { type: 'object' } });
      expect(parseStepContract({ ...contract }, 'source')).toEqual(contract);
    });

    it('throws when a required field is missing', () => {
      expect(() => parseStepContract({ id: 'ns.step', input: {} }, 'source')).toThrow(
        'source is not a step contract'
      );
    });

    it('throws when the id could escape the contracts directory', () => {
      expect(() => parseStepContract({ ...createContract('../ns.step') }, 'source')).toThrow(
        'source has an invalid step id "../ns.step"'
      );
    });
  });

  describe('serializeStepContract', () => {
    it('sorts keys and required lists, and keeps the order of other arrays', () => {
      const content = serializeStepContract(
        createContract('ns.step', {
          input: {
            type: 'object',
            properties: { b: { type: 'string', enum: ['z', 'a'] }, a: { type: 'string' } },
            required: ['b', 'a'],
          },
        })
      );

      expect(JSON.parse(content).input).toEqual({
        properties: { a: { type: 'string' }, b: { enum: ['z', 'a'], type: 'string' } },
        required: ['a', 'b'],
        type: 'object',
      });
      expect(Object.keys(JSON.parse(content))).toEqual([
        'exposure',
        'id',
        'input',
        'output',
        'stability',
      ]);
      expect(content.endsWith('}\n')).toBe(true);
    });

    it('gives the same content when only the field order changes', () => {
      const first = createContract('ns.step', {
        input: { properties: { a: {}, b: {} }, required: ['a', 'b'] },
      });
      const second = createContract('ns.step', {
        input: { required: ['b', 'a'], properties: { b: {}, a: {} } },
      });
      expect(serializeStepContract(first)).toBe(serializeStepContract(second));
    });
  });

  describe('writeStepContracts', () => {
    it('writes a file per step and reports the added, changed and removed steps', () => {
      writeStepContracts(
        [createContract('ns.kept'), createContract('ns.changed'), createContract('ns.removed')],
        dir
      );

      const result = writeStepContracts(
        [
          createContract('ns.kept'),
          createContract('ns.changed', { stability: 'stable' }),
          createContract('ns.added'),
        ],
        dir
      );

      expect(result).toEqual({
        added: ['ns.added'],
        changed: ['ns.changed'],
        removed: ['ns.removed'],
      });
      expect(Fs.readdirSync(dir).sort()).toEqual([
        'ns.added.json',
        'ns.changed.json',
        'ns.kept.json',
      ]);
      expect(readStepContractsFromDir(dir).find(({ id }) => id === 'ns.changed')).toMatchObject({
        stability: 'stable',
      });
    });
  });

  describe('readStepContractsFromDir', () => {
    it('returns no contracts when the directory does not exist', () => {
      expect(readStepContractsFromDir(Path.join(dir, 'missing'))).toEqual([]);
    });

    it('throws when a file holds the contract of another step', () => {
      Fs.writeFileSync(Path.join(dir, 'ns.a.json'), serializeStepContract(createContract('ns.b')));
      expect(() => readStepContractsFromDir(dir)).toThrow('holds the contract of step "ns.b"');
    });
  });

  describe('reading from git', () => {
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

    beforeEach(() => {
      git('init', '--quiet');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'Test');
      writeStepContracts(
        [createContract('ns.a'), createContract('ns.b')],
        Path.join(dir, 'contracts')
      );
      git('add', '.');
      git('commit', '--quiet', '-m', 'contracts');
    });

    it('reads the contracts committed at a ref', () => {
      Fs.rmSync(Path.join(dir, 'contracts', 'ns.b.json'));

      expect(
        readStepContractsFromGit({ ref: 'HEAD', dir: 'contracts', repoRoot: dir }).map(
          ({ id }) => id
        )
      ).toEqual(['ns.a', 'ns.b']);
    });

    it('returns no contracts when the directory does not exist at the ref', () => {
      expect(readStepContractsFromGit({ ref: 'HEAD', dir: 'missing', repoRoot: dir })).toEqual([]);
    });

    it('returns undefined for a file that does not exist at the ref', () => {
      expect(readFileFromGit({ ref: 'HEAD', path: 'missing.json', repoRoot: dir })).toBeUndefined();
    });

    it('throws for an unknown ref', () => {
      expect(() =>
        readStepContractsFromGit({ ref: 'unknown', dir: 'contracts', repoRoot: dir })
      ).toThrow();
    });
  });
});
