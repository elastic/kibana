import * as gqlRequest from './gqlRequest';
import { CommitSelected } from './Commit';
import {
  PullRequestEdge,
  fetchCommitsByAuthor,
  getExistingBackportPRs,
  TimelineItemEdge
} from './fetchCommitsByAuthor';
import { commitsWithPullRequestsMock } from './mocks/commitsByAuthorMock';
import { getDefaultOptions } from '../../test/getDefaultOptions';

describe('fetchCommitsByAuthor', () => {
  describe('when commit has an associated pull request', () => {
    let requestSpy: jasmine.Spy;
    let res: CommitSelected[];
    beforeEach(async () => {
      requestSpy = spyOn(gqlRequest, 'gqlRequest').and.returnValues(
        { user: { id: 'myUserId' } },
        commitsWithPullRequestsMock
      );

      const options = getDefaultOptions();
      res = await fetchCommitsByAuthor(options);
    });

    it('Should return a list of commits with pullNumber and existing backports', () => {
      expect(res).toEqual([
        {
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          message: 'Add 👻 (2e63475c)',
          existingBackports: []
        },
        {
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          message: 'Add witch (#85)',
          pullNumber: 85,
          existingBackports: []
        },
        {
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          message: 'Add SF mention (#80)',
          pullNumber: 80,
          existingBackports: [{ branch: '6.3', state: 'MERGED' }]
        },
        {
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          message: 'Add backport config (3827bbba)',
          existingBackports: []
        },
        {
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          message: 'Initial commit (5ea0da55)',
          existingBackports: []
        }
      ]);
    });

    it('should call with correct args to fetch author id', () => {
      expect(requestSpy.calls.argsFor(0)).toMatchSnapshot();
    });

    it('should call with correct args to fetch commits', () => {
      expect(requestSpy.calls.argsFor(1)).toMatchSnapshot();
    });
  });

  describe('existingBackports', () => {
    it('should return existingBackports when repoNames match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana');
      expect(res).toEqual([
        {
          existingBackports: [{ branch: '6.3', state: 'MERGED' }],
          message: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe'
        }
      ]);
    });

    it('should not return existingBackports when repoNames does not match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana2');
      expect(res).toEqual([
        {
          existingBackports: [],
          message: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe'
        }
      ]);
    });
  });

  describe('when a custom github api hostname is supplied', () => {
    it('should be used in gql requests', async () => {
      const requestSpy = spyOn(gqlRequest, 'gqlRequest').and.returnValues(
        { user: { id: 'myUserId' } },
        commitsWithPullRequestsMock
      );

      const options = getDefaultOptions({
        apiHostname: 'api.github.my-company.com'
      });
      await fetchCommitsByAuthor(options);

      expect(requestSpy.calls.argsFor(0)[0].apiHostname).toBe(
        'api.github.my-company.com'
      );
      expect(requestSpy.calls.argsFor(1)[0].apiHostname).toBe(
        'api.github.my-company.com'
      );
    });
  });
});

describe('getExistingBackportPRs', () => {
  let pullRequest: PullRequestEdge;
  beforeEach(() => {
    pullRequest = {
      node: {
        repository: {
          name: 'kibana',
          owner: {
            login: 'elastic'
          }
        },
        number: 1234,
        timelineItems: {
          edges: [
            {
              node: {
                source: {
                  __typename: 'PullRequest',
                  state: 'MERGED' as const,
                  commits: {
                    edges: [
                      { node: { commit: { message: 'my message (#1234)' } } }
                    ]
                  },
                  baseRefName: '7.x'
                }
              }
            }
          ]
        }
      }
    };
  });

  it('should return a result when commit messages match', () => {
    const existingPRs = getExistingBackportPRs(
      'my message (#1234)',
      pullRequest
    );

    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });

  it('should return a result when first line of commit message matches', () => {
    const timelineItem = pullRequest.node.timelineItems
      .edges[0] as TimelineItemEdge;

    timelineItem.node.source.commits.edges[0].node.commit.message =
      'my message (#1234)\n\nsomething else';
    const existingPRs = getExistingBackportPRs(
      'my message (#1234)',
      pullRequest
    );

    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });
});

async function getExistingBackportsByRepoName(
  repoName1: string,
  repoName2: string
) {
  const mock = {
    repository: {
      ref: {
        target: {
          history: {
            edges: [
              {
                node: {
                  oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                  message:
                    'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                  associatedPullRequests: {
                    edges: [
                      {
                        node: {
                          repository: {
                            name: repoName1,
                            owner: {
                              login: 'elastic'
                            }
                          },
                          number: 80,
                          timelineItems: {
                            edges: [
                              {
                                node: {
                                  source: {
                                    __typename: 'PullRequest',
                                    state: 'MERGED',
                                    baseRefName: '6.3',
                                    commits: {
                                      edges: [
                                        {
                                          node: {
                                            commit: {
                                              message:
                                                'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!'
                                            }
                                          }
                                        }
                                      ]
                                    }
                                  }
                                }
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      }
    }
  };

  spyOn(gqlRequest, 'gqlRequest').and.returnValues(
    { user: { id: 'myUserId' } },
    mock
  );

  const options = getDefaultOptions({
    repoName: repoName2
  });
  return fetchCommitsByAuthor(options);
}
