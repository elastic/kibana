import { ExistingTargetPullRequests } from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

describe('getTargetBranchesFromLabels', () => {
  it(`should support Kibana's label format`, () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'v8.0.0': 'master', // current major (master)
      '^v7.8.0$': '7.x', // current minor (7.x)
      '^v(\\d+).(\\d+).\\d+$': '$1.$2', // all other branches
    };
    const labels = [
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
    ];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      branchLabelMapping,
      labels,
    });
    expect(targetBranches).toEqual([
      '5.4',
      '5.5',
      '5.6',
      '6.0',
      '6.1',
      '6.2',
      '6.3',
      '6.4',
      '6.5',
      '6.6',
      '6.7',
      '6.8',
      '7.0',
      '7.1',
      '7.2',
      '7.3',
      '7.4',
      '7.5',
      '7.6',
      '7.7',
      '7.x',
    ]);
  });

  it('should only get first match', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-2': 'branch-b',
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-2'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-b']);
  });

  it('should remove PRs that are already open', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [
      { branch: 'branch-3', state: 'OPEN' },
    ] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-1', 'label-2', 'label-3', 'label-4'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-1', 'branch-2', 'branch-4']);
  });

  it('should remove PRs that are already merged', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [
      { branch: 'branch-2', state: 'MERGED' },
    ] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-1', 'label-2', 'label-3', 'label-4'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-1', 'branch-3', 'branch-4']);
  });

  it('should remove duplicates', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-1', 'label-2', 'label-2'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-1', 'branch-2']);
  });

  it('should ignore non-matching labels', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-1', 'label-2', 'foo', 'bar'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-1', 'branch-2']);
  });

  it('should omit empty labels', () => {
    const sourceBranch = 'master';
    const existingTargetPullRequests = [] as ExistingTargetPullRequests;
    const branchLabelMapping = {
      'label-2': '',
      'label-(\\d+)': 'branch-$1',
    };
    const labels = ['label-1', 'label-2'];
    const targetBranches = getTargetBranchesFromLabels({
      sourceBranch,
      existingTargetPullRequests,
      labels,
      branchLabelMapping,
    });
    expect(targetBranches).toEqual(['branch-1']);
  });
});
