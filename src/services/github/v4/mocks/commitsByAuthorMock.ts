import { CommitByAuthorResponse } from '../fetchCommitsByAuthor';

export const commitsWithPullRequestsMock: CommitByAuthorResponse = {
  repository: {
    ref: {
      target: {
        history: {
          edges: [
            {
              node: {
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
                committedDate: '2021-12-23T00:00:00Z',
                oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
                message: 'Add witch (#85)',
                associatedPullRequests: {
                  edges: [
                    {
                      node: {
                        baseRefName: 'master',
                        labels: {
                          nodes: [{ name: 'my-label-b' }],
                        },
                        mergeCommit: {
                          committedDate: '2021-01-01T00:00:00',
                          oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
                          message: 'Add witch (#85)',
                        },
                        repository: {
                          name: 'kibana',
                          owner: {
                            login: 'elastic',
                          },
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
                committedDate: '2021-12-22T00:00:00Z',
                oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                message:
                  'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                associatedPullRequests: {
                  edges: [
                    {
                      node: {
                        labels: {
                          nodes: [{ name: 'my-label-a' }],
                        },
                        mergeCommit: {
                          committedDate: '2021-01-01T00:00:00',
                          oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
                          message:
                            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                        },
                        repository: {
                          name: 'kibana',
                          owner: {
                            login: 'elastic',
                          },
                        },
                        baseRefName: 'master',
                        number: 80,
                        timelineItems: {
                          edges: [
                            {
                              node: {
                                source: {
                                  __typename: 'PullRequest',
                                  title: 'some title',
                                  state: 'MERGED',
                                  number: 99,
                                  baseRefName: '6.3',
                                  commits: {
                                    edges: [
                                      {
                                        node: {
                                          commit: {
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
