import stripAnsi from 'strip-ansi';
import { getChoicesForCommitPrompt } from './prompts';

describe('prompt', () => {
  describe('getChoicesForCommitPrompt', () => {
    it('should display status badges via `existingTargetPullRequests`', () => {
      const commits = [
        {
          targetBranchesFromLabels: {
            expected: ['8.0', '7.16'],
            missing: [],
            unmerged: [],
            merged: ['8.0', '7.16'],
          },
          sha: 'ae9d51b7fe3ee6f30d0d196c782e0dcabb7ac5ff',
          formattedMessage:
            '[APM] Remove log-log descriptions from correlation charts (#119700)',
          pullNumber: 119700,
          existingTargetPullRequests: [
            { number: 120178, branch: '8.0', state: 'MERGED' },
            { number: 120179, branch: '7.16', state: 'MERGED' },
          ],
        },
      ];

      const choices = getChoicesForCommitPrompt(commits as any).map(
        ({ name, short }) => ({ name: stripAnsi(name), short })
      );

      expect(choices).toEqual([
        {
          name: '1. [APM] Remove log-log descriptions from correlation charts (#119700) 8.0, 7.16',
          short: '#119700 (ae9d51b7)',
        },
      ]);
    });

    it('should display status badges via `targetBranchesFromLabels`', () => {
      const commits = [
        {
          targetBranchesFromLabels: {
            expected: ['8.0', '7.16', '7.15'],
            missing: ['7.15'],
            unmerged: [],
            merged: ['8.0', '7.16'],
          },
          sha: 'ae9d51b7fe3ee6f30d0d196c782e0dcabb7ac5ff',
          formattedMessage:
            '[APM] Remove log-log descriptions from correlation charts (#119700)',
          pullNumber: 119700,
          existingTargetPullRequests: [
            { number: 120178, branch: '8.0', state: 'MERGED' },
            { number: 120179, branch: '7.16', state: 'MERGED' },
          ],
        },
      ];

      const choices = getChoicesForCommitPrompt(commits as any).map(
        ({ name, short }) => ({ name: stripAnsi(name), short })
      );

      expect(choices).toEqual([
        {
          name: '1. [APM] Remove log-log descriptions from correlation charts (#119700) 8.0, 7.16, 7.15',
          short: '#119700 (ae9d51b7)',
        },
      ]);
    });

    it('should list choices', () => {
      const commits = [
        {
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sha: 'b1b491959dab47aeb83c88ee2accb2db46d23793',
          formattedMessage:
            '[APM] Prefer service.name for logs correlation (#120694)',
          pullNumber: 120694,
          existingTargetPullRequests: [],
        },
        {
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sha: 'b1bb4a93959f19a653b9cfb207a5c6acb6559482',
          formattedMessage:
            '[APM] Disable telemetry in agent config endpoint (#120106)',
          pullNumber: 120106,
          existingTargetPullRequests: [],
        },
        {
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sha: '434f6e6a88faf24dc1ea41f9f726db78e46355a7',
          formattedMessage:
            '[APM] Remove index_pattern.json and add custom field formatters (#119915)',
          pullNumber: 119915,
          existingTargetPullRequests: [],
        },
        {
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sha: 'ae9d51b7fe3ee6f30d0d196c782e0dcabb7ac5ff',
          formattedMessage:
            '[APM] Remove log-log descriptions from correlation charts (#119700)',
          pullNumber: 119700,
          existingTargetPullRequests: [],
        },
      ];

      const choices = getChoicesForCommitPrompt(commits as any).map(
        ({ name, short }) => ({ name: stripAnsi(name), short })
      );

      expect(choices).toEqual([
        {
          name: '1. [APM] Prefer service.name for logs correlation (#120694) ',
          short: '#120694 (b1b49195)',
        },
        {
          name: '2. [APM] Disable telemetry in agent config endpoint (#120106) ',
          short: '#120106 (b1bb4a93)',
        },
        {
          name: '3. [APM] Remove index_pattern.json and add custom field formatters (#119915) ',
          short: '#119915 (434f6e6a)',
        },
        {
          name: '4. [APM] Remove log-log descriptions from correlation charts (#119700) ',
          short: '#119700 (ae9d51b7)',
        },
      ]);
    });
  });
});
