import { BackportOptions } from '../options/options';
import { addRemote } from '../services/git';
import * as childProcess from '../services/child-process-promisified';

describe('addRemote', () => {
  it('add correct origin remote', async () => {
    const spy = jest.spyOn(childProcess, 'exec').mockResolvedValue({} as any);
    await addRemote(
      {
        accessToken: 'myAccessToken',
        repoOwner: 'elastic',
        repoName: 'kibana',
        gitHostname: 'github.com'
      } as BackportOptions,
      'elastic'
    );

    return expect(
      spy
    ).toHaveBeenCalledWith(
      'git remote add elastic https://myAccessToken@github.com/elastic/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });

  it('add correct user remote', async () => {
    const spy = jest.spyOn(childProcess, 'exec').mockResolvedValue({} as any);
    await addRemote(
      {
        accessToken: 'myAccessToken',
        repoOwner: 'elastic',
        repoName: 'kibana',
        gitHostname: 'github.com'
      } as BackportOptions,
      'sqren'
    );

    return expect(
      spy
    ).toHaveBeenCalledWith(
      'git remote add sqren https://myAccessToken@github.com/sqren/kibana.git',
      { cwd: '/myHomeDir/.backport/repositories/elastic/kibana' }
    );
  });

  it('allows custom github url', async () => {
    const spy = jest.spyOn(childProcess, 'exec').mockResolvedValue({} as any);
    await addRemote(
      {
        accessToken: 'myAccessToken',
        repoOwner: 'elastic',
        repoName: 'kibana',
        gitHostname: 'github.my-company.com'
      } as BackportOptions,
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
