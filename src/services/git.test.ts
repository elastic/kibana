import { BackportOptions } from '../options/options';
import {
  addRemote,
  getUnstagedFiles,
  getFilesWithConflicts,
  cherrypickContinue,
  deleteRemote,
  createFeatureBranch,
} from '../services/git';
import * as childProcess from '../services/child-process-promisified';
import { PromiseReturnType } from '../types/PromiseReturnType';

type ExecReturnType = PromiseReturnType<typeof childProcess.exec>;

describe('getUnstagedFiles', () => {
  it('should split by linebreak and remove empty items', async () => {
    const stdout = `add 'conflicting-file.txt'\nadd 'another-conflicting-file.js'\n`;
    jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stdout } as ExecReturnType);

    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
    } as BackportOptions;

    expect(await getUnstagedFiles(options)).toEqual([
      ' - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt',
      ' - /myHomeDir/.backport/repositories/elastic/kibana/another-conflicting-file.js',
    ]);
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
    jest.spyOn(childProcess, 'exec').mockRejectedValue(err as ExecReturnType);

    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
    } as BackportOptions;

    expect(await getFilesWithConflicts(options)).toEqual([
      ' - /myHomeDir/.backport/repositories/elastic/kibana/conflicting-file.txt',
    ]);
  });
});

describe('createFeatureBranch', () => {
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  const baseBranch = '4.x';
  const featureBranch = 'backport/4.x/commit-72f94e76';

  it('should throw HandledError', () => {
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

    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect(
      createFeatureBranch(options, baseBranch, featureBranch)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The branch \\"4.x\\" is invalid or doesn't exist"`
    );
  });

  it('should rethrow normal error', () => {
    expect.assertions(1);
    const err = new Error('just a normal error');
    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect.assertions(1);

    expect(
      createFeatureBranch(options, baseBranch, featureBranch)
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

    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect(await deleteRemote(options, remoteName)).toBe(undefined);
  });

  it('should rethrow normal error', async () => {
    const err = new Error('just a normal error');
    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect.assertions(1);

    expect(
      deleteRemote(options, remoteName)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"just a normal error"`);
  });
});

describe('cherrypickContinue', () => {
  const options = {
    repoOwner: 'elastic',
    repoName: 'kibana',
  } as BackportOptions;

  it('should swallow cherrypick error', async () => {
    const err = {
      killed: false,
      code: 128,
      signal: null,
      cmd: 'git -c core.editor=true cherry-pick --continue',
      stdout: '',
      stderr:
        'error: no cherry-pick or revert in progress\nfatal: cherry-pick failed\n',
    };

    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect(await cherrypickContinue(options)).toBe(undefined);
  });

  it('should re-throw other errors', async () => {
    const err = new Error('non-cherrypick error');
    jest.spyOn(childProcess, 'exec').mockRejectedValue(err);
    expect.assertions(1);

    expect(
      cherrypickContinue(options)
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
      .mockResolvedValue({} as ExecReturnType);
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
      .mockResolvedValue({} as ExecReturnType);
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
      .mockResolvedValue({} as ExecReturnType);
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
