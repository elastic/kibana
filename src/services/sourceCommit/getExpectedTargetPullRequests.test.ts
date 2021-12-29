import nock from 'nock';
import { getExpectedTargetPullRequests } from './getExpectedTargetPullRequests';
import { getMockSourceCommit } from './getMockSourceCommit';

describe('getExpectedTargetPullRequests', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should return empty when there is no associated PR', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: null,
    });

    const branchLabelMapping = {};
    const expectedTargetPRs = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPRs).toEqual([]);
  });

  it('should return a result when sourceCommit message matches the commit of the target pull request', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: { number: 1234 },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPRs = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPRs).toEqual([
      {
        branch: '6.x',
        state: 'MERGED',
        number: 5678,
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
    ]);
  });

  it('should return empty when repoName does not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: { number: 1234 },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
          repoName: 'foo', // this repo name
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([]);
  });

  it('should return empty when repoOwner does not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: { number: 1234 },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
          repoOwner: 'foo', // this
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([]);
  });

  it('should return empty when commit messages do not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'message one (#1234)' },
      sourcePullRequest: {
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([]);
  });

  it('should return a result if commits messages are different but title includes message and number', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'message one (#1234)' },
      sourcePullRequest: {
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          title: 'message one (#1234)',
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([
      {
        branch: '6.x',
        state: 'MERGED',
        number: 5678,
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
    ]);
  });

  it('should return empty when only pull request title (but not pull number) matches', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'message one (#1234)' },
      sourcePullRequest: {
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          title: 'message one (#9999)',
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([]);
  });

  it('should return a result when first line of a multiline commit message matches', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'message one (#1234)' },
      sourcePullRequest: {
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message one (#1234)\n\nsomething else'],
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {};
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([
      {
        branch: '6.x',
        state: 'MERGED',
        number: 5678,
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
    ]);
  });

  it('should return missing target pull requests', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'message one (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['v7.2.0', 'v7.1.0'],
      },
      timelineItems: [],
    });
    const branchLabelMapping = {
      'v8.0.0': 'master',
      '^v(\\d+).(\\d+).\\d+$': '$1.$2',
    };
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([
      { branch: '7.2', state: 'MISSING' },
      { branch: '7.1', state: 'MISSING' },
    ]);
  });

  it('should not show merged PRs as missing', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['v7.2.0', 'v7.1.0'],
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '7.2',
          commitMessages: ['identical messages (#1234)'],
          title: 'identical messages (#9999)',
          number: 5678,
        },
      ],
    });
    const branchLabelMapping = {
      'v8.0.0': 'master',
      '^v(\\d+).(\\d+).\\d+$': '$1.$2',
    };
    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );
    expect(expectedTargetPullRequests).toEqual([
      {
        branch: '7.2',
        state: 'MERGED',
        number: 5678,
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
      { branch: '7.1', state: 'MISSING' },
    ]);
  });

  it(`should support Kibana's label format`, () => {
    const branchLabelMapping = {
      'v8.0.0': 'master', // current major (master)
      '^v7.8.0$': '7.x', // current minor (7.x)
      '^v(\\d+).(\\d+).\\d+$': '$1.$2', // all other branches
    };

    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: [
          'release_note:fix',
          'v5.4.3',
          'v5.5.3',
          'v5.6.16',
          'v6.0.1',
          'v6.1.4',
          'v6.2.5',
          'v6.3.3',
          'v6.4.4',
          'v6.5.5',
          'v6.6.3',
          'v6.7.2',
          'v6.8.4',
          'v7.0.2',
          'v7.1.2',
          'v7.2.2',
          'v7.3.3',
          'v7.4.1',
          'v7.5.0',
          'v7.6.0',
          'v7.7.0',
          'v7.8.0', // 7.x
          'v8.0.0', // master
        ],
      },
    });

    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );

    expect(expectedTargetPullRequests).toEqual([
      { branch: '5.4', state: 'MISSING' },
      { branch: '5.5', state: 'MISSING' },
      { branch: '5.6', state: 'MISSING' },
      { branch: '6.0', state: 'MISSING' },
      { branch: '6.1', state: 'MISSING' },
      { branch: '6.2', state: 'MISSING' },
      { branch: '6.3', state: 'MISSING' },
      { branch: '6.4', state: 'MISSING' },
      { branch: '6.5', state: 'MISSING' },
      { branch: '6.6', state: 'MISSING' },
      { branch: '6.7', state: 'MISSING' },
      { branch: '6.8', state: 'MISSING' },
      { branch: '7.0', state: 'MISSING' },
      { branch: '7.1', state: 'MISSING' },
      { branch: '7.2', state: 'MISSING' },
      { branch: '7.3', state: 'MISSING' },
      { branch: '7.4', state: 'MISSING' },
      { branch: '7.5', state: 'MISSING' },
      { branch: '7.6', state: 'MISSING' },
      { branch: '7.7', state: 'MISSING' },
      { branch: '7.x', state: 'MISSING' },
      { branch: 'master', state: 'MISSING' },
    ]);
  });

  it('should only get first match', () => {
    const branchLabelMapping = {
      'label-2': 'branch-b',
      'label-(\\d+)': 'branch-$1',
    };

    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['label-2'],
      },
    });

    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );

    expect(expectedTargetPullRequests).toEqual([
      { branch: 'branch-b', state: 'MISSING' },
    ]);
  });

  it('shows open PRs', () => {
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };

    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['label-1', 'label-2', 'label-3', 'label-4'],
      },
      timelineItems: [
        {
          state: 'OPEN',
          targetBranch: 'branch-3',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
        },
      ],
    });

    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );

    expect(expectedTargetPullRequests).toEqual([
      {
        branch: 'branch-3',
        number: 5678,
        state: 'OPEN',
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
      { branch: 'branch-1', state: 'MISSING' },
      { branch: 'branch-2', state: 'MISSING' },
      { branch: 'branch-4', state: 'MISSING' },
    ]);
  });

  it('ignores closed PRs (treats them as MISSING)', () => {
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };

    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['label-1', 'label-2', 'label-3', 'label-4'],
      },
      timelineItems: [
        {
          state: 'CLOSED',
          targetBranch: 'branch-3',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
        },
      ],
    });

    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );

    expect(expectedTargetPullRequests).toEqual([
      { branch: 'branch-1', state: 'MISSING' },
      { branch: 'branch-2', state: 'MISSING' },
      { branch: 'branch-3', state: 'MISSING' },
      { branch: 'branch-4', state: 'MISSING' },
    ]);
  });

  it('shows merged PRs', () => {
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };

    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'identical messages (#1234)' },
      sourcePullRequest: {
        number: 1234,
        labels: ['label-1', 'label-2', 'label-3', 'label-4'],
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: 'branch-3',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
        },
      ],
    });

    const expectedTargetPullRequests = getExpectedTargetPullRequests(
      mockSourceCommit,
      branchLabelMapping
    );

    expect(expectedTargetPullRequests).toEqual([
      {
        branch: 'branch-3',
        number: 5678,
        state: 'MERGED',
        url: 'https://github.com/elastic/kibana/pull/5678',
      },
      { branch: 'branch-1', state: 'MISSING' },
      { branch: 'branch-2', state: 'MISSING' },
      { branch: 'branch-4', state: 'MISSING' },
    ]);
  });
});
