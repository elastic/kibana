import axios from 'axios';
import inquirer from 'inquirer';
import * as createPullRequest from './services/github/createPullRequest';
import * as fetchCommitsByAuthor from './services/github/fetchCommitsByAuthor';
import * as fs from './services/fs-promisified';
import { BackportOptions } from './options/options';
import { commitsWithPullRequestsMock } from './services/github/mocks/commitsByAuthorMock';
import { runWithOptions } from './runWithOptions';
import * as childProcess from './services/child-process-promisified';

describe('runWithOptions', () => {
  let rpcExecMock: jest.SpyInstance;
  let rpcExecOriginalMock: jest.SpyInstance;
  let inquirerPromptMock: jest.SpyInstance;
  let axiosHeadSpy: jest.SpyInstance;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const options: BackportOptions = {
      accessToken: 'myAccessToken',
      all: false,
      apiHostname: 'api.github.com',
      author: 'sqren',
      backportCreatedLabels: [],
      branches: [],
      branchChoices: [
        { name: '6.x' },
        { name: '6.0' },
        { name: '5.6' },
        { name: '5.5' },
        { name: '5.4' }
      ],
      commitsCount: 10,
      editor: 'code',
      fork: true,
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: false,
      multipleCommits: false,
      path: undefined,
      prDescription: 'myPrDescription',
      prTitle: 'myPrTitle {baseBranch} {commitMessages}',
      pullNumber: undefined,
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      sha: undefined,
      username: 'sqren',
      verbose: false
    };

    rpcExecMock = (childProcess.exec as any) as jest.SpyInstance;
    rpcExecOriginalMock = (childProcess.execAsCallback as any) as jest.SpyInstance;

    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    jest.spyOn(fetchCommitsByAuthor, 'fetchCommitsByAuthor');
    jest.spyOn(createPullRequest, 'createPullRequest');

    inquirerPromptMock = jest
      .spyOn(inquirer, 'prompt')
      .mockImplementationOnce((async (args: any) => {
        return { promptResult: args[0].choices[0].value };
      }) as any)
      .mockImplementationOnce((async (args: any) => {
        return { promptResult: args[0].choices[0].name };
      }) as any);

    // mock verifyAccessToken
    axiosHeadSpy = jest.spyOn(axios, 'head').mockReturnValueOnce(true as any);

    // mock axios post request (graphql)
    jest
      .spyOn(axios, 'post')

      // mock author id
      .mockReturnValueOnce({
        data: {
          data: {
            user: {
              id: 'sqren_author_id'
            }
          }
        }
      } as any)

      // mock list of commits
      .mockReturnValueOnce({
        data: {
          data: commitsWithPullRequestsMock
        }
      } as any)

      // mock create pull request
      .mockReturnValueOnce({
        data: {
          html_url: 'pull request url',
          number: 1337
        }
      } as any);

    await runWithOptions(options);
  });

  it('should check whether access token is valid', () => {
    expect(axiosHeadSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/elastic/kibana?access_token=myAccessToken'
    );
  });

  it('getCommit should be called with correct args', () => {
    expect(fetchCommitsByAuthor.fetchCommitsByAuthor).toHaveBeenCalledWith(
      expect.objectContaining({
        repoName: 'kibana',
        repoOwner: 'elastic',
        username: 'sqren',
        apiHostname: 'api.github.com'
      })
    );
  });

  it('createPullRequest should be called with correct args', () => {
    expect(createPullRequest.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        repoName: 'kibana',
        repoOwner: 'elastic',
        apiHostname: 'api.github.com'
      }),
      {
        base: '6.x',
        body: `Backports the following commits to 6.x:\n - Add 👻 (2e63475c)\n\nmyPrDescription`,
        head: 'sqren:backport/6.x/commit-2e63475c',
        title: 'myPrTitle 6.x Add 👻 (2e63475c)'
      }
    );
  });

  it('prompt calls should match snapshot', () => {
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(inquirerPromptMock.mock.calls).toMatchSnapshot();
  });

  it('exec should be called with correct args', () => {
    expect(rpcExecMock).toHaveBeenCalledTimes(9);
    expect(rpcExecMock.mock.calls).toMatchSnapshot();
  });

  it('git clone should be called with correct args', () => {
    expect(rpcExecOriginalMock).toHaveBeenCalledTimes(1);
    expect(rpcExecOriginalMock.mock.calls).toMatchSnapshot();
  });
});
