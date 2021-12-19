import stripAnsi from 'strip-ansi';
import { getChoicesForCommitPrompt } from './prompts';
import { Commit } from './sourceCommit/parseSourceCommit';

describe('prompt', () => {
  describe('getChoicesForCommitPrompt', () => {
    it('should display status badges via `expectedTargetPullRequests`', () => {
      const commits = [
        {
          sha: 'ae9d51b7fe3ee6f30d0d196c782e0dcabb7ac5ff',
          originalMessage:
            '[APM] Remove log-log descriptions from correlation charts (#119700)',
          pullNumber: 119700,
          expectedTargetPullRequests: [
            { number: 120178, branch: '8.0', state: 'MERGED' },
            { number: 120179, branch: '7.16', state: 'MERGED' },
            { number: 120179, branch: '7.15', state: 'MISSING' },
          ],
        },
      ];

      const choices = getChoicesForCommitPrompt(commits as any, false).map(
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
      const commits: Commit[] = [
        {
          committedDate: '',
          sourceBranch: 'master',
          sha: 'b1b491959dab47aeb83c88ee2accb2db46d23793',
          originalMessage:
            '[APM] Prefer service.name for logs correlation (#120694)',
          pullNumber: 120694,
          expectedTargetPullRequests: [],
        },
        {
          committedDate: '',
          sourceBranch: 'master',
          sha: 'b1bb4a93959f19a653b9cfb207a5c6acb6559482',
          originalMessage:
            '[APM] Disable telemetry in agent config endpoint (#120106)',
          pullNumber: 120106,
          expectedTargetPullRequests: [],
        },
        {
          committedDate: '',
          sourceBranch: 'master',
          sha: '434f6e6a88faf24dc1ea41f9f726db78e46355a7',
          originalMessage:
            '[APM] Remove index_pattern.json and add custom field formatters (#119915)',
          pullNumber: 119915,
          expectedTargetPullRequests: [],
        },
        {
          committedDate: '',
          sourceBranch: 'master',
          sha: 'ae9d51b7fe3ee6f30d0d196c782e0dcabb7ac5ff',
          originalMessage:
            '[APM] Remove log-log descriptions from correlation charts (#119700)',
          pullNumber: 119700,
          expectedTargetPullRequests: [],
        },
      ];

      const choices = getChoicesForCommitPrompt(commits, false).map(
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
