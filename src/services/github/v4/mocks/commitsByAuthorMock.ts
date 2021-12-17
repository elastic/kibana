import { CommitByAuthorResponse } from '../fetchCommits/fetchCommitsByAuthor';

export const commitsByAuthorMock: CommitByAuthorResponse = {
  repository: {
    ref: {
      target: {
        history: {
          edges: [
            {
              node: {
                repository: {
                  name: 'kibana',
                  owner: { login: 'elastic' },
                },
                committedDate: '2021-12-24T00:00:00Z',
                oid: '2e63475c483f7844b0f2833bc57fdee32095bacb',
                message: 'Add 👻',
                associatedPullRequests: {
                  edges: [],
                },
              },
            },
            {
              node: {
                repository: {
                  name: 'kibana',
                  owner: { login: 'elastic' },
                },
                committedDate: '2021-12-23T00:00:00Z',
                oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
                message: 'Add witch (#85)',
                associatedPullRequests: {
                  edges: [
                    {
                      node: {
                        url: 'https://github.com/elastic/kibana/pull/85',
                        baseRefName: 'master',
                        labels: {
                          nodes: [{ name: 'my-label-b' }],
                        },
                        number: 85,
                        timelineItems: {
                          edges: [],
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              node: {
                repository: {
                  name: 'kibana',
                  owner: { login: 'elastic' },
                },
                committedDate: '2021-12-22T00:00:00Z',
                oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                message:
                  'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                associatedPullRequests: {
                  edges: [
                    {
                      node: {
                        url: 'https://github.com/elastic/kibana/pull/80',
                        labels: {
                          nodes: [{ name: 'v6.3.0' }],
                        },
                        baseRefName: 'master',
                        number: 80,
                        timelineItems: {
                          edges: [
                            {
                              node: {
                                targetPullRequest: {
                                  __typename: 'PullRequest',
                                  url: 'https://github.com/elastic/kibana/pull/99',
                                  title: 'some title',
                                  state: 'MERGED',
                                  number: 99,
                                  baseRefName: '6.3',
                                  commits: {
                                    edges: [
                                      {
                                        node: {
                                          targetCommit: {
                                            repository: {
                                              name: 'kibana',
                                              owner: { login: 'elastic' },
                                            },
                                            committedDate:
                                              '2021-12-23T00:00:00Z',
                                            oid: 'abc',
                                            message:
                                              'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                                          },
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              node: {
                repository: {
                  name: 'kibana',
                  owner: { login: 'elastic' },
                },
                committedDate: '2021-12-21T00:00:00Z',
                oid: '3827bbbaf39914eda4f02f6940189844375fd097',
                message: 'Add backport config',
                associatedPullRequests: {
                  edges: [],
                },
              },
            },
            {
              node: {
                repository: {
                  name: 'kibana',
                  owner: { login: 'elastic' },
                },
                committedDate: '2021-12-20T00:00:00Z',
                oid: '5ea0da550ac191029459289d67f99ad7d310812b',
                message: 'Initial commit',
                associatedPullRequests: {
                  edges: [],
                },
              },
            },
          ],
        },
      },
    },
  },
};
