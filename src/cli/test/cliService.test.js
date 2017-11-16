const axios = require('axios');
const inquirer = require('inquirer');
const nock = require('nock');
const os = require('os');
const httpAdapter = require('axios/lib/adapters/http');

const cliService = require('../cliService');
const rpc = require('../../lib/rpc');

axios.defaults.host = 'http://localhost';
axios.defaults.adapter = httpAdapter;

describe('doBackportVersion', () => {
  beforeEach(() => {
    os.homedir = jest.fn(() => '/homefolder');
    rpc.exec = jest.fn().mockReturnValue(Promise.resolve());
    rpc.mkdirp = jest.fn().mockReturnValue(Promise.resolve());

    this.addLabelMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/issues/1337/labels`, ['backport'])
      .query(true)
      .reply(200, {});
  });

  it('with pull request reference', () => {
    this.createPRMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/pulls`, {
        title: '[6.x] myCommitMessage | myOtherCommitMessage',
        body:
          'Backports the following commits to 6.x:\n - myCommitMessage (#myPullRequest)\n - myOtherCommitMessage (#myOtherPullRequest)',
        head: 'sqren:backport/6.x/pr-myPullRequest_pr-myOtherPullRequest',
        base: '6.x'
      })
      .query(true)
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl'
      });

    return cliService
      .doBackportVersion({
        owner: 'elastic',
        repoName: 'kibana',
        commits: [
          {
            sha: 'mySha',
            message: 'myCommitMessage',
            pullRequest: 'myPullRequest'
          },
          {
            sha: 'mySha2',
            message: 'myOtherCommitMessage',
            pullRequest: 'myOtherPullRequest'
          }
        ],
        version: '6.x',
        username: 'sqren',
        labels: ['backport']
      })
      .then(res => {
        expect(res.config).toMatchSnapshot();
        expect(rpc.exec.mock.calls).toMatchSnapshot();
        expect(this.createPRMock.isDone()).toBe(true);
        expect(this.addLabelMock.isDone()).toBe(true);
      });
  });

  it('without pull request reference', () => {
    this.createPRMock = nock('https://api.github.com')
      .post(`/repos/elastic/kibana/pulls`, {
        title: '[6.x] myCommitMessage',
        body:
          'Backports the following commits to 6.x:\n - myCommitMessage (mySha)',
        head: 'sqren:backport/6.x/commit-mySha',
        base: '6.x'
      })
      .query(true)
      .reply(200, {
        number: 1337,
        html_url: 'myHtmlUrl'
      });

    return cliService
      .doBackportVersion({
        owner: 'elastic',
        repoName: 'kibana',
        commits: [
          {
            sha: 'mySha',
            message: 'myCommitMessage'
          }
        ],
        version: '6.x',
        username: 'sqren'
      })
      .then(res => {
        expect(res.config).toMatchSnapshot();
        expect(rpc.exec.mock.calls).toMatchSnapshot();
        expect(this.createPRMock.isDone()).toBe(true);
        expect(this.addLabelMock.isDone()).toBe(false);
      });
  });
});

describe('withPullRequest', () => {
  function mockGithubIssuesResponse(res) {
    return nock('https://api.github.com')
      .get(`/search/issues`)
      .query(true)
      .reply(200, res);
  }

  it('should decorate commit with pull request if available', () => {
    mockGithubIssuesResponse({
      items: [{ number: 'myPullRequest' }]
    });

    return cliService
      .withPullRequest('elastic', 'kibana', [{ message: 'myCommitMessage' }])
      .then(res =>
        expect(res).toEqual([
          { message: 'myCommitMessage', pullRequest: 'myPullRequest' }
        ])
      );
  });

  it('should not decorate commit, when pull request is not available', () => {
    mockGithubIssuesResponse({ items: [] });

    return cliService
      .withPullRequest('elastic', 'kibana', [
        { sha: 'myCommitSha', message: 'myCommitMessage' }
      ])
      .then(res =>
        expect(res).toEqual([
          {
            sha: 'myCommitSha',
            message: 'myCommitMessage',
            pullRequest: undefined
          }
        ])
      );
  });
});

describe('promptRepoInfo', () => {
  function mockPrompt() {
    inquirer.prompt = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve({ promptResult: 'elastic/kibana' }));
  }

  describe('without matching cwd', () => {
    beforeEach(() => {
      mockPrompt();

      return cliService
        .promptRepoInfo(
          [{ name: 'elastic/kibana' }, { name: 'elastic/elasticsearch' }],
          '/foo/bar'
        )
        .then(res => (this.res = res));
    });

    it('should call prompt with available repositories', () => {
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          choices: ['elastic/kibana', 'elastic/elasticsearch']
        })
      ]);
    });

    it('should return selected repository', () => {
      expect(this.res).toEqual({ owner: 'elastic', repoName: 'kibana' });
    });
  });

  describe('with matching cwd', () => {
    beforeEach(() => {
      mockPrompt();

      return cliService
        .promptRepoInfo(
          [{ name: 'elastic/kibana' }, { name: 'elastic/elasticsearch' }],
          '/foo/elasticsearch'
        )
        .then(res => (this.res = res));
    });

    it('should not call prompt', () => {
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should return selected repository', () => {
      expect(this.res).toEqual({ owner: 'elastic', repoName: 'elasticsearch' });
    });
  });
});
