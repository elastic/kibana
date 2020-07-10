import { BackportOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import {
  addRemote,
  getUnmergedFiles,
  finalizeCherrypick,
  deleteRemote,
  cherrypick,
  getFilesWithConflicts,
  createBackportBranch,
} from '../services/git';
import { ExecError } from '../test/ExecError';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getUnmergedFiles', () => {
  it('should split lines and remove empty', async () => {
    jest.spyOn(childProcess, 'exec').mockResolvedValueOnce({
      stdout: 'conflicting-file.txt\nconflicting-file2.txt\n',
      stderr: '',
    });

    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
    } as BackportOptions;

    await expect(await getUnmergedFiles(options)).toEqual([
      '/myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt',
      '/myHomeDir/.backport/repositories/elastic/kibana/conflicting-file2.txt',
    ]);
  });

  it('should not error on empty', async () => {
    jest.spyOn(childProcess, 'exec').mockResolvedValueOnce({
      stdout: '',
      stderr: '',
    });

    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
    } as BackportOptions;

    await expect(await getUnmergedFiles(options)).toEqual([]);
  });
});

describe('getFilesWithConflicts', () => {
  it('should split by linebreak and remove empty and duplicate items', async () => {
    const err = {
      killed: false,
      code: 2,
      signal: null,
      cmd: 'git --no-pager diff --check',
      stdout:
        'conflicting-file.txt:1: leftover conflict marker\nconflicting-file.txt:3: leftover conflict marker\nconflicting-file.txt:5: leftover conflict marker\n',
      stderr: '',
    };
    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);

    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
    } as BackportOptions;

    expect(await getFilesWithConflicts(options)).toEqual([
      '/myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt',
    ]);
  });
});

describe('createFeatureBranch', () => {
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  const targetBranch = '4.x';
  const backportBranch = 'backport/4.x/commit-72f94e76';

  it(`should handle "couldn't find remote ref" error`, async () => {
    expect.assertions(1);
    const err = {
      killed: false,
      code: 128,
      signal: null,
      cmd: '',
      stdout:
        'HEAD is now at 72f94e7 Create "conflicting-file.txt" in master\n',
      stderr: "fatal: couldn't find remote ref 4.x\n",
    };

    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    await expect(
      createBackportBranch({ options, targetBranch, backportBranch })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The branch \\"4.x\\" is invalid or doesn't exist"`
    );
  });

  it('should throw "Invalid refspec" error', async () => {
    expect.assertions(1);
    const err = {
      killed: false,
      code: 128,
      signal: null,
      cmd: '',
      stdout: '',
      stderr:
        "fatal: Invalid refspec 'https://github.com/elastic/kibana.git'\n",
    };

    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    await expect(
      createBackportBranch({ options, targetBranch, backportBranch })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The branch \\"4.x\\" is invalid or doesn't exist"`
    );
  });

  it('should rethrow normal error', async () => {
    expect.assertions(1);
    const err = new Error('just a normal error');
    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    expect.assertions(1);

    await expect(
      createBackportBranch({ options, targetBranch, backportBranch })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"just a normal error"`);
  });
});

describe('deleteRemote', () => {
  const remoteName = 'my-remote';
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  it('should swallow exec error', async () => {
    const err = {
      killed: false,
      code: 128,
      signal: null,
      cmd: 'git remote rm origin',
      stdout: '',
      stderr: "fatal: No such remote: 'origin'\n",
    };

    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    await expect(await deleteRemote(options, remoteName)).toBe(undefined);
  });

  it('should rethrow normal error', async () => {
    const err = new Error('just a normal error');
    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    expect.assertions(1);

    await expect(
      deleteRemote(options, remoteName)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"just a normal error"`);
  });
});

describe('cherrypick', () => {
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  const commit = {
    sourceBranch: '7.x',
    formattedMessage: '',
    sha: 'abcd',
    targetBranchesFromLabels: [],
  };

  it('should return `needsResolving: false` when no errors are encountered', async () => {
    jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockResolvedValueOnce({ stderr: '', stdout: '' });

    expect(await cherrypick(options, commit)).toEqual({
      needsResolving: false,
    });
  });

  it('should use mainline option when specified', async () => {
    const execSpy = jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockResolvedValueOnce({ stderr: '', stdout: '' });

    await cherrypick({ ...options, mainline: 1 }, commit);

    expect(execSpy.mock.calls[1][0]).toBe('git cherry-pick --mainline 1 abcd');
  });

  it('should return `needsResolving: true` upon cherrypick error', async () => {
    jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockRejectedValueOnce(
        new ExecError({
          killed: false,
          code: 128,
          cmd: 'git cherry-pick abcd',
          stdout: '',
          stderr: '',
        })
      )

      // mock getFilesWithConflicts
      .mockRejectedValueOnce(
        new ExecError({
          code: 2,
          cmd: 'git --no-pager diff --check',
          stdout:
            'conflicting-file.txt:1: leftover conflict marker\nconflicting-file.txt:3: leftover conflict marker\nconflicting-file.txt:5: leftover conflict marker\n',
          stderr: '',
        })
      )

      // mock getUnmergedFiles
      .mockResolvedValueOnce({ stdout: '', stderr: '' });

    expect(await cherrypick(options, commit)).toEqual({
      needsResolving: true,
    });
  });

  it('it should let the user know about the "--mainline" argument when cherry-picking a merge commit without specifying it', async () => {
    jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockRejectedValueOnce(
        new ExecError({
          killed: false,
          code: 128,
          signal: null,
          cmd: 'git cherry-pick 381c7b604110257437a289b1f1742685eb8d79c5',
          stdout: '',
          stderr:
            'error: commit 381c7b604110257437a289b1f1742685eb8d79c5 is a merge but no -m option was given.\nfatal: cherry-pick failed\n',
        })
      );

    await expect(cherrypick(options, commit)).rejects
      .toThrowError(`Cherrypick failed because the selected commit was a merge commit. Please try again by specifying the parent with the \`mainline\` argument:

> backport --mainline

or:

> backport --mainline <parent-number>

Or refer to the git documentation for more information: https://git-scm.com/docs/git-cherry-pick#Documentation/git-cherry-pick.txt---mainlineparent-number`);
  });

  it('it should gracefully handle empty commits', async () => {
    jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockRejectedValueOnce(
        new ExecError({
          killed: false,
          code: 1,
          signal: null,
          cmd: 'git cherry-pick fe6b13b83cc010f722548cd5a0a8c2d5341a20dd',
          stdout:
            'On branch backport/7.x/pr-58692\nYou are currently cherry-picking commit fe6b13b83cc.\n\nnothing to commit, working tree clean\n',
          stderr:
            "The previous cherry-pick is now empty, possibly due to conflict resolution.\nIf you wish to commit it anyway, use:\n\n    git commit --allow-empty\n\nOtherwise, please use 'git cherry-pick --skip'\n",
        })
      );

    await expect(cherrypick(options, commit)).rejects.toThrowError(
      `Cherrypick failed because the selected commit (abcd) is empty. This is most likely caused by attemping to backporting a commit that was already backported`
    );
  });

  it('should re-throw non-cherrypick errors', async () => {
    jest
      .spyOn(childProcess, 'exec')

      // mock git fetch
      .mockResolvedValueOnce({ stderr: '', stdout: '' })

      // mock cherry pick command
      .mockRejectedValueOnce(new Error('non-cherrypick error'))

      // getFilesWithConflicts
      .mockResolvedValueOnce({ stdout: '', stderr: '' })

      // getUnmergedFiles
      .mockResolvedValueOnce({ stdout: '', stderr: '' });

    await expect(
      cherrypick(options, commit)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"non-cherrypick error"`);
  });
});

describe('cherrypickContinue', () => {
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  it('should swallow error if changes have already been committed manaully', async () => {
    const err = {
      killed: false,
      code: 1,
      signal: null,
      cmd: 'git commit --no-edit',
      stdout:
        'On branch backport/7.x/commit-913afb3b\nnothing to commit, working tree clean\n',
      stderr: '',
    };

    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    await expect(await finalizeCherrypick(options)).toBe(undefined);
  });

  it('should re-throw other errors', async () => {
    const err = new Error('non-cherrypick error');
    jest.spyOn(childProcess, 'exec').mockRejectedValueOnce(err);
    expect.assertions(1);

    await expect(
      finalizeCherrypick(options)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"non-cherrypick error"`);
  });
});

describe('addRemote', () => {
  const options = {
    accessToken: 'myAccessToken',
    repoOwner: 'elastic',
    repoName: 'kibana',
    gitHostname: 'github.com',
  } as BackportOptions;

  it('add correct origin remote', async () => {
    const spy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValueOnce({ stderr: '', stdout: '' });
    await addRemote(options, 'elastic');

    return expect(
      spy
    ).toHaveBeenCalledWith(
      'git remote add elastic https://myAccessToken@github.com/elastic/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });

  it('add correct user remote', async () => {
    const spy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValueOnce({ stderr: '', stdout: '' });
    await addRemote(options, 'sqren');

    return expect(
      spy
    ).toHaveBeenCalledWith(
      'git remote add sqren https://myAccessToken@github.com/sqren/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });

  it('allows custom github url', async () => {
    const spy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValueOnce({ stderr: '', stdout: '' });
    await addRemote(
      { ...options, gitHostname: 'github.my-company.com' },
      'sqren'
    );

    return expect(
      spy
    ).toHaveBeenCalledWith(
      'git remote add sqren https://myAccessToken@github.my-company.com/sqren/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });
});
